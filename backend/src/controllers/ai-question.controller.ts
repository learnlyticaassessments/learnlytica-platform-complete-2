/**
 * AI Question Controller
 * Handles HTTP requests for AI-powered question generation
 */

import { Request, Response } from 'express';
import {
  generateQuestion,
  generateTestCases,
  improveQuestion,
  reviewStudentCode
} from '../services/ai-question-generator.service';
import { evaluateAICapability, getAICapabilityMatrix } from '../services/ai-capabilities.service';
import { createQuestion, runDraftQuestionTests, validateDraftQuestionPackage } from '../services/question.service';
import type { CreateQuestionDTO, QuestionCategory, QuestionDifficulty, TestFramework } from '../../shared/types/question.types';

type PipelineContext = {
  organizationId: string;
  userId: string;
  userRole: string;
};

const generationCooldownMs = Math.max(1000, Number(process.env.AI_BATCH_COOLDOWN_MS || 15000));
const generationRateWindowMs = Math.max(5000, Number(process.env.AI_BATCH_RATE_WINDOW_MS || 60000));
const generationRateLimit = Math.max(1, Number(process.env.AI_BATCH_RATE_LIMIT || 4));
const requestWindowByUser = new Map<string, { lastAt: number; hits: number; windowStart: number }>();

type ErrorCategory = 'validation' | 'provider' | 'evaluator' | 'network' | 'authorization' | 'unknown';

function categorizeError(err: any): ErrorCategory {
  const msg = String(err?.message || '').toLowerCase();
  const code = Number(err?.statusCode || err?.status || 0);
  if (code === 401 || code === 403) return 'authorization';
  if (code === 400 || code === 422 || msg.includes('missing required') || msg.includes('invalid')) return 'validation';
  if (msg.includes('openai') || msg.includes('anthropic') || msg.includes('provider') || msg.includes('model')) return 'provider';
  if (msg.includes('verification') || msg.includes('tests') || msg.includes('draft')) return 'evaluator';
  if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) return 'network';
  return 'unknown';
}

function buildIdempotencyKey(req: Request): string | null {
  const headerKey = String(req.headers['x-idempotency-key'] || '').trim();
  if (headerKey) return headerKey.slice(0, 120);
  const bodyKey = String((req.body as any)?.idempotencyKey || '').trim();
  if (bodyKey) return bodyKey.slice(0, 120);
  return null;
}

function enforceGenerationRateLimit(userId: string, questionCount: number) {
  if (questionCount <= 1) return;
  const now = Date.now();
  const state = requestWindowByUser.get(userId) || { lastAt: 0, hits: 0, windowStart: now };
  if (now - state.lastAt < generationCooldownMs) {
    const err: any = new Error(`Batch generation cooldown active. Retry in ${Math.ceil((generationCooldownMs - (now - state.lastAt)) / 1000)}s.`);
    err.statusCode = 429;
    err.errorType = 'rate_limit';
    throw err;
  }
  if (now - state.windowStart > generationRateWindowMs) {
    state.windowStart = now;
    state.hits = 0;
  }
  state.hits += 1;
  state.lastAt = now;
  requestWindowByUser.set(userId, state);
  if (state.hits > generationRateLimit) {
    const err: any = new Error('Batch generation rate limit exceeded for this user.');
    err.statusCode = 429;
    err.errorType = 'rate_limit';
    throw err;
  }
}

async function persistGenerationAudit(db: any, params: {
  organizationId: string;
  userId: string;
  userRole: string;
  requestPayload: any;
  outcome: 'generated' | 'created' | 'failed';
  capability?: any;
  pipeline?: any;
  generatedMeta?: any;
  errorType?: string;
  errorMessage?: string;
}) {
  try {
    await db.insertInto('ai_generation_audit').values({
      organization_id: params.organizationId,
      user_id: params.userId,
      user_role: params.userRole,
      request_json: params.requestPayload || {},
      capability_json: params.capability || {},
      pipeline_json: params.pipeline || {},
      generation_meta_json: params.generatedMeta || {},
      outcome: params.outcome,
      error_type: params.errorType || null,
      error_message: params.errorMessage || null
    }).execute();
  } catch (err) {
    console.warn('AI generation audit insert failed', err);
  }
}

async function queueManualReview(db: any, params: {
  organizationId: string;
  userId: string;
  capability: any;
  requestPayload: any;
  reason: string;
}) {
  try {
    await db.insertInto('ai_generation_manual_reviews').values({
      organization_id: params.organizationId,
      requested_by: params.userId,
      capability_state: String(params.capability?.state || 'planned'),
      reason: params.reason,
      request_json: params.requestPayload || {},
      capability_json: params.capability || {}
    }).execute();
  } catch (err) {
    console.warn('AI manual review queue insert failed', err);
  }
}

function mapDifficulty(value: string): QuestionDifficulty {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'beginner' || normalized === 'easy') return 'easy';
  if (normalized === 'intermediate' || normalized === 'medium') return 'medium';
  if (normalized === 'advanced' || normalized === 'hard') return 'hard';
  return 'medium';
}

function mapCategory(value: string, questionType?: string): QuestionCategory {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'frontend') return 'frontend';
  if (normalized === 'backend') return 'backend';
  if (normalized === 'fullstack') return 'fullstack';
  if (normalized === 'database') return 'database';
  if (normalized === 'devops') return 'devops';

  const fromType = String(questionType || '').toLowerCase();
  if (fromType === 'component') return 'frontend';
  if (fromType === 'database') return 'database';
  if (fromType === 'fullstack') return 'fullstack';
  return 'backend';
}

function mapProblemStyle(value: string): CreateQuestionDTO['problemStyle'] {
  const normalized = String(value || '').toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'algorithmic') return 'algorithmic';
  if (normalized === 'scenario_driven' || normalized === 'scenario-driven' || normalized === 'case_study') return 'scenario_driven';
  if (normalized === 'debugging') return 'debugging';
  if (normalized === 'implementation') return 'implementation';
  if (normalized === 'optimization' || normalized === 'performance') return 'optimization';
  if (normalized === 'design_tradeoff' || normalized === 'system_design') return 'design_tradeoff';
  return 'implementation';
}

function mapFramework(language: string, rawFramework?: string): TestFramework {
  const fromResponse = String(rawFramework || '').toLowerCase();
  if (fromResponse === 'jest' || fromResponse === 'pytest' || fromResponse === 'junit' || fromResponse === 'playwright' || fromResponse === 'mocha' || fromResponse === 'cypress') {
    return fromResponse as TestFramework;
  }
  const lang = String(language || '').toLowerCase();
  if (lang === 'python') return 'pytest';
  if (lang === 'java') return 'junit';
  return 'jest';
}

function defaultStarterPath(language: string, questionType: string): string {
  const lang = String(language || '').toLowerCase();
  if (lang === 'python') return 'solution.py';
  if (lang === 'java') return 'src/Main.java';
  if (String(questionType || '').toLowerCase() === 'component') return 'src/App.jsx';
  return 'solution.js';
}

function normalizeStarterCode(generated: any, language: string, questionType: string) {
  const fallbackPath = defaultStarterPath(language, questionType);
  const files = Array.isArray(generated?.starterCode?.files) ? generated.starterCode.files : [];
  const normalizedFiles = (files.length ? files : [{ name: fallbackPath, content: '// TODO: implement' }]).map((f: any) => ({
    path: String(f.path || f.name || fallbackPath),
    content: String(f.content || ''),
    language: language === 'python' ? 'python' : language === 'java' ? 'java' : 'javascript'
  }));

  return {
    files: normalizedFiles,
    dependencies: {},
    scripts: {}
  };
}

function normalizeSolution(generated: any, starterPath: string, language: string) {
  const fallbackSolution =
    language === 'python'
      ? 'def solve(*args, **kwargs):\n    return None\n'
      : language === 'java'
        ? 'public class Main {\n  public static Object solve(Object input) {\n    return input;\n  }\n}\n'
        : 'function solve(input) { return input; }\nmodule.exports = { solve };\n';
  const solutionValue = generated?.solution;
  if (solutionValue && typeof solutionValue === 'object' && Array.isArray(solutionValue.files)) {
    return {
      files: solutionValue.files.map((f: any) => ({
        path: String(f.path || f.name || starterPath),
        content: String(f.content || ''),
        language: language === 'python' ? 'python' : language === 'java' ? 'java' : 'javascript'
      }))
    };
  }

  return {
    files: [
      {
        path: starterPath,
        content: String(solutionValue || fallbackSolution),
        language: language === 'python' ? 'python' : language === 'java' ? 'java' : 'javascript'
      }
    ]
  };
}

function normalizeTestCases(
  generated: any,
  framework: TestFramework,
  totalPoints: number,
  rubric?: {
    basicWeight?: number;
    edgeWeight?: number;
    negativeWeight?: number;
    performanceWeight?: number;
    hiddenTestPercent?: number;
  }
) {
  const raw = Array.isArray(generated?.testConfig?.testCases) ? generated.testConfig.testCases : [];
  const fallbackCount = 6;
  const source = raw.length ? raw : Array.from({ length: fallbackCount }).map((_, i) => ({
    id: `test-${i + 1}`,
    name: `Generated Test ${i + 1}`,
    points: Math.floor(totalPoints / fallbackCount),
    testCode: ''
  }));
  const defaultFile = framework === 'pytest'
    ? 'tests/test_solution.py'
    : framework === 'junit'
      ? 'src/test/java/SolutionTest.java'
      : 'tests/solution.spec.js';

  const evenPoints = Math.max(1, Math.floor(totalPoints / source.length));
  const normalized = source.map((tc: any, index: number) => ({
    id: String(tc.id || `test-${index + 1}`),
    name: String(tc.name || `Generated Test ${index + 1}`),
    description: tc.description ? String(tc.description) : undefined,
    file: String(tc.file || defaultFile),
    testName: String(tc.testName || `generated_test_${index + 1}`),
    testCode: String(tc.testCode || ''),
    points: Number(tc.points || evenPoints),
    visible: tc.visible ?? true,
    category: tc.category ? String(tc.category).toLowerCase() : undefined
  }));

  const hiddenPct = Math.max(0, Math.min(90, Number(rubric?.hiddenTestPercent ?? 35)));
  const targetHidden = normalized.length > 0 ? Math.max(1, Math.round((normalized.length * hiddenPct) / 100)) : 0;
  let hiddenCount = normalized.filter((tc: any) => tc.visible === false).length;
  for (let i = normalized.length - 1; i >= 0 && hiddenCount < targetHidden; i -= 1) {
    if (normalized[i].visible !== false) {
      normalized[i].visible = false;
      hiddenCount++;
    }
  }

  const hasEdge = normalized.some((tc: any) => tc.category === 'edge');
  const hasNegative = normalized.some((tc: any) => tc.category === 'negative');
  const hasPerformance = normalized.some((tc: any) => tc.category === 'performance');

  if (!hasEdge && normalized.length > 1) normalized[1].category = 'edge';
  if (!hasNegative && normalized.length > 2) normalized[2].category = 'negative';
  if (!hasPerformance && normalized.length > 0) normalized[normalized.length - 1].category = 'performance';

  const categoryWeights = {
    basic: Math.max(1, Number(rubric?.basicWeight ?? 40)),
    edge: Math.max(1, Number(rubric?.edgeWeight ?? 25)),
    negative: Math.max(1, Number(rubric?.negativeWeight ?? 20)),
    performance: Math.max(1, Number(rubric?.performanceWeight ?? 15))
  };

  const group = {
    basic: normalized.filter((tc: any) => (tc.category || 'basic') === 'basic'),
    edge: normalized.filter((tc: any) => tc.category === 'edge'),
    negative: normalized.filter((tc: any) => tc.category === 'negative'),
    performance: normalized.filter((tc: any) => tc.category === 'performance')
  };
  const presentCategories = (Object.keys(group) as Array<keyof typeof group>).filter((k) => group[k].length > 0);
  const totalWeight = presentCategories.reduce((sum, c) => sum + categoryWeights[c], 0) || 1;
  let allocated = 0;
  for (const cat of presentCategories) {
    const catPoints = Math.floor((totalPoints * categoryWeights[cat]) / totalWeight);
    const perCase = Math.max(1, Math.floor(catPoints / group[cat].length));
    for (const tc of group[cat]) {
      tc.points = perCase;
      allocated += perCase;
    }
  }
  let remainder = totalPoints - allocated;
  let idx = 0;
  while (remainder > 0 && normalized.length > 0) {
    normalized[idx % normalized.length].points += 1;
    remainder -= 1;
    idx += 1;
  }

  return normalized;
}

function toCreateQuestionDto(generated: any, request: any): CreateQuestionDTO {
  const language = String(request?.language || 'javascript');
  const framework = mapFramework(language, generated?.testConfig?.framework);
  const difficulty = mapDifficulty(generated?.difficulty || request?.difficulty);
  const category = mapCategory(generated?.category, request?.questionType);
  const problemStyle = mapProblemStyle(generated?.problemStyle || request?.problemStyle);
  const technicalFocus = String(request?.questionType || generated?.technicalFocus || '').trim() || undefined;
  const rubricTotal = Number(request?.rubric?.totalPoints || 0);
  const points = Math.max(10, Number(rubricTotal || generated?.points || request?.points || 100));
  const starterCode = normalizeStarterCode(generated, language, String(request?.questionType || 'algorithm'));
  const starterPath = starterCode.files?.[0]?.path || defaultStarterPath(language, String(request?.questionType || 'algorithm'));
  const solution = normalizeSolution(generated, starterPath, language);
  const testCases = normalizeTestCases(generated, framework, points, request?.rubric);
  const totalFromCases = testCases.reduce((sum: number, tc: any) => sum + Number(tc.points || 0), 0);
  const scoringTotal = totalFromCases > 0 ? totalFromCases : points;

  return {
    title: String(generated?.title || 'AI Generated Question'),
    description: String(generated?.description || request?.topic || 'AI generated question'),
    category,
    problemStyle,
    technicalFocus,
    subcategory: [],
    difficulty,
    skills: [],
    tags: Array.isArray(generated?.tags) ? generated.tags.map((t: any) => String(t)) : [],
    starterCode,
    testFramework: framework,
    testConfig: {
      framework,
      version: '1.0.0',
      environment: framework === 'pytest' ? { python: '3.11' } : framework === 'junit' ? { java: '17' } : { node: '20' },
      setup: generated?.testConfig?.setup || { commands: framework === 'pytest' ? ['pip install pytest'] : ['npm install'] },
      execution: {
        command: generated?.testConfig?.execution?.command || (framework === 'pytest' ? 'pytest -q' : framework === 'junit' ? 'mvn test' : framework === 'playwright' ? 'npx playwright test' : framework === 'mocha' ? 'npx mocha' : framework === 'cypress' ? 'npx cypress run' : 'npx jest --runInBand'),
        timeout: Number(generated?.testConfig?.execution?.timeout || 30000),
        retries: Number(generated?.testConfig?.execution?.retries || 0),
        parallelism: Boolean(generated?.testConfig?.execution?.parallelism ?? false)
      },
      testCases,
      scoring: {
        total: scoringTotal,
        passing: Math.max(1, Math.ceil(scoringTotal * (Math.max(1, Math.min(100, Number(request?.rubric?.passingPercent || 60))) / 100)))
      }
    },
    solution,
    timeEstimate: Math.max(5, Number(generated?.timeLimit || request?.timeLimit || 30)),
    points: scoringTotal
  };
}

async function runGenerationPipeline(db: any, requestPayload: any, context: PipelineContext) {
  const generated = await generateQuestion(requestPayload);
  const dto = toCreateQuestionDto(generated, requestPayload);
  const validation = await validateDraftQuestionPackage(db, dto, context);
  const verification = await runDraftQuestionTests(db, dto, context, { useSolution: true });
  return { generated, dto, validation, verification };
}

function enforceCapabilityOrThrow(requestPayload: any) {
  const generationMode = String(requestPayload?.generationMode || 'production') as 'production' | 'design';
  const capability = evaluateAICapability(
    String(requestPayload?.language || 'javascript'),
    String(requestPayload?.questionType || 'algorithm'),
    String(requestPayload?.problemStyle || 'implementation')
  );
  if (generationMode === 'production' && capability.state !== 'ready') {
    const err: any = new Error(
      `Selected combination is not production-ready (${capability.state}). Switch to Design mode or choose evaluator-ready options.`
    );
    err.statusCode = 422;
    err.capability = capability;
    throw err;
  }
  return capability;
}

/**
 * POST /api/v1/ai/generate-question
 * Generate a complete question using AI
 */
export async function generateQuestionHandler(req: Request, res: Response) {
  try {
    const {
      topic,
      language,
      difficulty,
      questionType,
      problemStyle,
      generationMode,
      points,
      timeLimit,
      provider,
      model,
      retryWithFallback,
      curriculumText,
      audienceType,
      audienceExperience,
      targetMaturity,
      domain,
      audienceNotes,
      rubric
    } = req.body;
    const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000000';
    const organizationId = (req as any).user?.organizationId || '00000000-0000-0000-0000-000000000000';
    const userRole = (req as any).user?.role || 'admin';

    if (!topic || !language || !difficulty || !questionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic, language, difficulty, questionType',
        errorType: 'validation'
      });
    }

    enforceGenerationRateLimit(userId, Math.max(1, Number(req.body?.questionCount || 1)));

    const requestPayload = {
      topic,
      language,
      difficulty,
      questionType,
      problemStyle,
      generationMode,
      points,
      timeLimit,
      provider,
      model,
      retryWithFallback,
      curriculumText,
      audienceType,
      audienceExperience,
      targetMaturity,
      domain,
      audienceNotes,
      rubric
    };
    const pipelineContext: PipelineContext = {
      organizationId,
      userId,
      userRole
    };

    const capability = enforceCapabilityOrThrow(requestPayload);
    if (capability.state !== 'ready') {
      await queueManualReview(req.app.locals.db, {
        organizationId,
        userId,
        capability,
        requestPayload,
        reason: 'Non-ready capability combination used for generation'
      });
    }
    const { generated, dto, validation, verification } = await runGenerationPipeline(
      req.app.locals.db,
      requestPayload,
      pipelineContext
    );
    const generatedMeta = (generated as any)?.__generationMeta || undefined;
    await persistGenerationAudit(req.app.locals.db, {
      organizationId,
      userId,
      userRole,
      requestPayload,
      outcome: 'generated',
      capability,
      pipeline: {
        validated: Boolean(validation?.valid),
        verified: Boolean(verification?.success),
        testsRun: verification?.testsRun || 0,
        testsPassed: verification?.testsPassed || 0
      },
      generatedMeta
    });

    res.json({
      success: true,
      data: dto,
      pipeline: {
        validated: Boolean(validation?.valid),
        verified: Boolean(verification?.success),
        testsRun: verification?.testsRun || 0,
        testsPassed: verification?.testsPassed || 0,
        pointsEarned: verification?.pointsEarned || 0,
        totalPoints: verification?.totalPoints || 0
      },
      capability,
      generationMeta: generatedMeta,
      message: 'Question generated, validated, and verified successfully'
    });

  } catch (error: any) {
    console.error('Generate Question Error:', error);
    await persistGenerationAudit(req.app.locals.db, {
      organizationId: (req as any).user?.organizationId || '00000000-0000-0000-0000-000000000000',
      userId: (req as any).user?.id || '00000000-0000-0000-0000-000000000000',
      userRole: (req as any).user?.role || 'admin',
      requestPayload: req.body || {},
      outcome: 'failed',
      errorType: categorizeError(error),
      errorMessage: error?.message || 'Failed to generate question',
      capability: error?.capability
    });
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate question',
      capability: error?.capability,
      errorType: error?.errorType || categorizeError(error)
    });
  }
}

/**
 * POST /api/v1/ai/generate-and-create
 * Generate question with AI and save to database
 */
export async function generateAndCreateHandler(req: Request, res: Response) {
  try {
    const {
      topic,
      language,
      difficulty,
      questionType,
      problemStyle,
      generationMode,
      points,
      timeLimit,
      provider,
      model,
      retryWithFallback,
      curriculumText,
      audienceType,
      audienceExperience,
      targetMaturity,
      domain,
      audienceNotes,
      rubric
    } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        errorType: 'authorization'
      });
    }

    const idempotencyKey = buildIdempotencyKey(req);
    if (idempotencyKey) {
      const existing = await req.app.locals.db
        .selectFrom('ai_generation_idempotency')
        .select(['response_json', 'status_code'])
        .where('organization_id', '=', organizationId)
        .where('user_id', '=', userId)
        .where('idempotency_key', '=', idempotencyKey)
        .executeTakeFirst();
      if (existing?.response_json) {
        const payload = typeof existing.response_json === 'string'
          ? JSON.parse(existing.response_json)
          : existing.response_json;
        return res.status(Number(existing.status_code || 200)).json(payload);
      }
    }

    const requestPayload = {
      topic,
      language,
      difficulty,
      questionType,
      problemStyle,
      generationMode,
      points,
      timeLimit,
      provider,
      model,
      retryWithFallback,
      curriculumText,
      audienceType,
      audienceExperience,
      targetMaturity,
      domain,
      audienceNotes,
      rubric
    };
    const pipelineContext: PipelineContext = {
      organizationId,
      userId,
      userRole: (req as any).user?.role || 'admin'
    };
    const capability = enforceCapabilityOrThrow(requestPayload);
    if (capability.state !== 'ready') {
      await queueManualReview(req.app.locals.db, {
        organizationId,
        userId,
        capability,
        requestPayload,
        reason: 'Generate-and-create invoked with non-ready capability'
      });
    }
    const { generated, dto, validation, verification } = await runGenerationPipeline(
      req.app.locals.db,
      requestPayload,
      pipelineContext
    );

    if (!validation?.valid) {
      return res.status(422).json({
        success: false,
        error: 'AI generated question failed schema validation',
        details: validation
      });
    }

    if (!verification?.success || (verification?.testsRun > 0 && verification?.testsPassed < verification?.testsRun)) {
      return res.status(422).json({
        success: false,
        error: 'AI generated question failed draft verification. Review test output and regenerate.',
        details: {
          testsRun: verification?.testsRun || 0,
          testsPassed: verification?.testsPassed || 0,
          output: verification?.output || ''
        }
      });
    }

    // Create in database
    const question = await createQuestion(
      req.app.locals.db,
      dto,
      {
        userId,
        organizationId,
        userRole: (req as any).user?.role || 'admin'
      }
    );

    const responsePayload = {
      success: true,
      data: {
        question,
        generatedSolution: generated.solution,
        pipeline: {
          validated: Boolean(validation?.valid),
          verified: Boolean(verification?.success),
          testsRun: verification?.testsRun || 0,
          testsPassed: verification?.testsPassed || 0,
          pointsEarned: verification?.pointsEarned || 0,
          totalPoints: verification?.totalPoints || 0
        },
        capability,
        generationMeta: (generated as any)?.__generationMeta || null
      },
      message: 'Question generated, validated, verified, and created successfully'
    };

    if (idempotencyKey) {
      await req.app.locals.db
        .insertInto('ai_generation_idempotency')
        .values({
          organization_id: organizationId,
          user_id: userId,
          idempotency_key: idempotencyKey,
          status_code: 201,
          response_json: responsePayload
        })
        .onConflict((oc: any) => oc.columns(['organization_id', 'user_id', 'idempotency_key']).doNothing())
        .execute();
    }

    await persistGenerationAudit(req.app.locals.db, {
      organizationId,
      userId,
      userRole: (req as any).user?.role || 'admin',
      requestPayload,
      outcome: 'created',
      capability,
      pipeline: {
        validated: Boolean(validation?.valid),
        verified: Boolean(verification?.success),
        testsRun: verification?.testsRun || 0,
        testsPassed: verification?.testsPassed || 0
      },
      generatedMeta: (generated as any)?.__generationMeta || null
    });

    res.status(201).json(responsePayload);

  } catch (error: any) {
    console.error('Generate and Create Error:', error);
    await persistGenerationAudit(req.app.locals.db, {
      organizationId: (req as any).user?.organizationId || '00000000-0000-0000-0000-000000000000',
      userId: (req as any).user?.id || '00000000-0000-0000-0000-000000000000',
      userRole: (req as any).user?.role || 'admin',
      requestPayload: req.body || {},
      outcome: 'failed',
      errorType: categorizeError(error),
      errorMessage: error?.message || 'Failed to generate and create question',
      capability: error?.capability
    });
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate and create question',
      capability: error?.capability,
      errorType: error?.errorType || categorizeError(error)
    });
  }
}

/**
 * POST /api/v1/ai/dry-run-preview
 * Returns sanitized payload + prompt summary before generation
 */
export async function dryRunPreviewHandler(req: Request, res: Response) {
  try {
    const requestPayload = {
      topic: String(req.body?.topic || '').trim(),
      language: String(req.body?.language || 'javascript'),
      difficulty: String(req.body?.difficulty || 'intermediate'),
      questionType: String(req.body?.questionType || 'algorithm'),
      problemStyle: String(req.body?.problemStyle || 'implementation'),
      generationMode: String(req.body?.generationMode || 'production'),
      provider: String(req.body?.provider || 'claude'),
      model: String(req.body?.model || ''),
      questionCount: Math.max(1, Math.min(25, Number(req.body?.questionCount || 1))),
      curriculumChars: String(req.body?.curriculumText || '').length,
      domain: String(req.body?.domain || ''),
      audienceType: String(req.body?.audienceType || ''),
      targetMaturity: String(req.body?.targetMaturity || ''),
      rubric: req.body?.rubric || {}
    };
    const capability = evaluateAICapability(
      requestPayload.language,
      requestPayload.questionType,
      requestPayload.problemStyle
    );
    res.json({
      success: true,
      data: {
        payload: requestPayload,
        capability,
        summary: [
          `${requestPayload.generationMode} mode`,
          `${requestPayload.language}/${requestPayload.questionType}/${requestPayload.problemStyle}`,
          `count=${requestPayload.questionCount}`,
          `provider=${requestPayload.provider} model=${requestPayload.model || 'default'}`
        ].join(' | ')
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build dry run preview',
      errorType: categorizeError(error)
    });
  }
}

export async function getAICapabilitiesHandler(_req: Request, res: Response) {
  const matrix = getAICapabilityMatrix();
  res.json({
    success: true,
    data: matrix
  });
}

/**
 * POST /api/v1/ai/generate-tests
 * Generate test cases for existing code
 */
export async function generateTestsHandler(req: Request, res: Response) {
  try {
    const { code, language, description, provider, model } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, language'
      });
    }

    const testCases = await generateTestCases(code, language, description, { provider, model });

    res.json({
      success: true,
      data: testCases,
      message: 'Test cases generated successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/ai/improve-question
 * Get suggestions to improve existing question
 */
export async function improveQuestionHandler(req: Request, res: Response) {
  try {
    const { question, provider, model } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question data required'
      });
    }

    const improvements = await improveQuestion(question, { provider, model });

    res.json({
      success: true,
      data: improvements,
      message: 'Improvements generated successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/ai/review-code
 * Review student code submission
 */
export async function reviewCodeHandler(req: Request, res: Response) {
  try {
    const { code, testResults, question, provider, model } = req.body;

    if (!code || !testResults || !question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, testResults, question'
      });
    }

    const review = await reviewStudentCode(code, testResults, question, { provider, model });

    res.json({
      success: true,
      data: review,
      message: 'Code review completed'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
