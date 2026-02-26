/**
 * Question Service Layer
 * Business logic for question management
 * @module services/question.service
 */

import {
  createQuestion as dbCreateQuestion,
  getQuestionById as dbGetQuestionById,
  listQuestions as dbListQuestions,
  updateQuestion as dbUpdateQuestion,
  deleteQuestion as dbDeleteQuestion,
  rowToQuestion
} from '../models/question.model';
import {
  validateCreateQuestion,
  validateUpdateQuestion,
  validateQuestionFilters,
  generateSlug,
  validateTestCases,
  validateSolution,
  type CreateQuestionInput,
  type UpdateQuestionInput,
  type QuestionFiltersInput
} from '../validators/question.validator';
import type {
  Question,
  QuestionListResponse,
  QuestionPreview,
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionFilters
} from '../../shared/types/question.types';
import { runTestsWithJava } from './test-runner.service';
import JSZip from 'jszip';

// ============================================================================
// ERRORS
// ============================================================================

export class QuestionNotFoundError extends Error {
  constructor(id: string) {
    super(`Question not found: ${id}`);
    this.name = 'QuestionNotFoundError';
  }
}

export class QuestionValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'QuestionValidationError';
  }
}

type QuestionPackageManifest = {
  schemaVersion?: number;
  title?: string;
  description?: string;
  category?: any;
  difficulty?: any;
  testFramework?: any;
  points?: number;
  timeEstimate?: number;
  skills?: string[];
  tags?: string[];
  starterCode?: {
    files?: Array<{ path: string; source?: string; content?: string; language?: string }>;
  };
  solution?: {
    files?: Array<{ path: string; source?: string; content?: string; language?: string }>;
  };
  testCases?: Array<any>;
};

const QUESTION_PACKAGE_SCHEMA_VERSION = 1;

function inferCodeLanguageFromFramework(framework: string) {
  if (framework === 'pytest') return 'python';
  if (framework === 'junit') return 'java';
  return 'javascript';
}

function inferCodeLanguageFromPath(path: string, fallback: string) {
  const p = String(path || '').toLowerCase();
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.java')) return 'java';
  if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.ts') || p.endsWith('.tsx')) return 'javascript';
  return fallback;
}

function buildDefaultStarterCodeForFramework(category: string, framework: string) {
  if (framework === 'junit') {
    return [{ path: 'src/Main.java', content: 'public class Main {\n  // TODO: Implement solution\n}\n', language: 'java' }];
  }
  if (framework === 'pytest') {
    return [{ path: category === 'backend' ? 'app.py' : 'solution.py', content: '# TODO: Implement solution\n', language: 'python' }];
  }
  return [{ path: category === 'frontend' ? 'src/index.js' : 'solution.js', content: '// TODO: Implement solution\n', language: 'javascript' }];
}

export class QuestionSlugExistsError extends Error {
  constructor(slug: string) {
    super(`Question with slug '${slug}' already exists`);
    this.name = 'QuestionSlugExistsError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ============================================================================
// CREATE QUESTION
// ============================================================================

export async function createQuestion(
  db: any,
  data: CreateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Validate input
  const validation = validateCreateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid question data',
      validation.error.errors
    );
  }

  const validatedData = validation.data;

  // Validate test cases
  const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
  if (!testCaseValidation.valid) {
    throw new QuestionValidationError(
      'Invalid test cases configuration',
      testCaseValidation.errors.map(e => ({ message: e }))
    );
  }

  // Validate solution if provided
  if (validatedData.solution) {
    const solutionValidation = validateSolution(
      validatedData.starterCode,
      validatedData.solution
    );
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // Generate unique slug
  const baseSlug = generateSlug(validatedData.title);
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create question
  const question = await dbCreateQuestion(db, {
    ...validatedData,
    organizationId: context.organizationId,
    createdBy: context.userId,
    slug
  } as any);

  return question;
}

export async function runDraftQuestionTests(
  _db: any,
  data: CreateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  },
  opts?: { code?: string; useSolution?: boolean }
) {
  void _db;
  void context;

  // Validate with the pure validators to avoid any persistence side effects.
  const validation = validateCreateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError('Invalid draft question', validation.error.errors);
  }
  const validatedData = validation.data as CreateQuestionDTO;

  const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
  if (!testCaseValidation.valid) {
    throw new QuestionValidationError(
      'Invalid test cases configuration',
      testCaseValidation.errors.map((e) => ({ message: e }))
    );
  }

  if (validatedData.solution) {
    const solutionValidation = validateSolution(validatedData.starterCode as any, validatedData.solution as any);
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map((e) => ({ message: e }))
      );
    }
  }

  const codeFromSolution =
    opts?.useSolution !== false
      ? validatedData.solution?.files?.[0]?.content
      : undefined;
  const codeFromRequest = opts?.code?.trim() ? opts.code : undefined;
  const fallbackStarter = validatedData.starterCode?.files?.[0]?.content;

  const codeToRun = codeFromRequest || codeFromSolution || fallbackStarter;
  if (!codeToRun) {
    throw new QuestionValidationError('No code available to run', [{ field: 'solution.files.0.content', message: 'Provide a solution or code to run tests' }]);
  }

  const questionLike = {
    ...validatedData,
    testConfig: validatedData.testConfig
  };

  return runTestsWithJava(codeToRun, validatedData.testConfig, questionLike);
}

export async function validateDraftQuestionPackage(
  _db: any,
  data: CreateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
) {
  void _db;
  void context;

  const validation = validateCreateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError('Invalid draft question', validation.error.errors);
  }
  const validatedData = validation.data as CreateQuestionDTO;

  const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
  if (!testCaseValidation.valid) {
    throw new QuestionValidationError(
      'Invalid test cases configuration',
      testCaseValidation.errors.map((e) => ({ message: e }))
    );
  }

  if (validatedData.solution) {
    const solutionValidation = validateSolution(validatedData.starterCode as any, validatedData.solution as any);
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map((e) => ({ message: e }))
      );
    }
  }

  return {
    valid: true,
    summary: {
      framework: validatedData.testFramework,
      category: validatedData.category,
      starterFiles: validatedData.starterCode?.files?.length || 0,
      solutionFiles: validatedData.solution?.files?.length || 0,
      testCases: validatedData.testConfig?.testCases?.length || 0,
      totalPoints: validatedData.testConfig?.scoring?.total || validatedData.points || 0,
      passingPoints: validatedData.testConfig?.scoring?.passing || 0
    }
  };
}

export async function parseQuestionPackageZip(
  zipBuffer: Buffer,
  defaults?: Partial<Pick<CreateQuestionDTO, 'category' | 'difficulty' | 'testFramework' | 'points' | 'timeEstimate'>>
): Promise<CreateQuestionDTO> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const manifestEntry =
    zip.file('learnlytica-question.json') ||
    zip.file('question.json') ||
    zip.file('manifest.json');

  if (!manifestEntry) {
    throw new QuestionValidationError('Invalid question package', [{ field: 'manifest', message: 'Missing learnlytica-question.json' }]);
  }

  let manifest: QuestionPackageManifest;
  try {
    manifest = JSON.parse(await manifestEntry.async('string'));
  } catch (e: any) {
    throw new QuestionValidationError('Invalid question package', [{ field: 'manifest', message: `Invalid JSON: ${e?.message || 'parse error'}` }]);
  }

  if (manifest.schemaVersion != null && manifest.schemaVersion !== QUESTION_PACKAGE_SCHEMA_VERSION) {
    throw new QuestionValidationError('Invalid question package', [
      { field: 'schemaVersion', message: `Unsupported schemaVersion ${manifest.schemaVersion}. Expected ${QUESTION_PACKAGE_SCHEMA_VERSION}` }
    ]);
  }

  const category = (manifest.category || defaults?.category || 'frontend') as any;
  const difficulty = (manifest.difficulty || defaults?.difficulty || 'medium') as any;
  const framework = (manifest.testFramework || defaults?.testFramework || 'jest') as any;
  const fallbackLanguage = inferCodeLanguageFromFramework(framework);

  const readZipText = async (path: string) => {
    const normalized = String(path || '').replace(/^\/+/, '');
    const entry = zip.file(normalized);
    if (!entry) {
      throw new QuestionValidationError('Invalid question package', [{ field: 'zip', message: `Missing referenced file: ${normalized}` }]);
    }
    return entry.async('string');
  };

  const loadFiles = async (
    dirPrefix: string,
    manifestFiles?: Array<{ path: string; source?: string; content?: string; language?: string }>
  ) => {
    if (manifestFiles?.length) {
      const files: any[] = [];
      for (const f of manifestFiles) {
        const content = typeof f.content === 'string' ? f.content : f.source ? await readZipText(f.source) : '';
        files.push({
          path: f.path,
          content,
          language: f.language || inferCodeLanguageFromPath(f.path, fallbackLanguage)
        });
      }
      return files;
    }

    const out: any[] = [];
    const tasks: Promise<void>[] = [];
    zip.forEach((relativePath, entry) => {
      if (entry.dir || !relativePath.startsWith(`${dirPrefix}/`)) return;
      const logicalPath = relativePath.slice(dirPrefix.length + 1);
      if (!logicalPath) return;
      tasks.push((async () => {
        const content = await readZipText(relativePath);
        out.push({
          path: logicalPath,
          content,
          language: inferCodeLanguageFromPath(logicalPath, fallbackLanguage)
        });
      })());
    });
    await Promise.all(tasks);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  };

  const starterFiles = await loadFiles('starter', manifest.starterCode?.files);
  const solutionFiles = await loadFiles('solution', manifest.solution?.files);
  const defaultStarterFiles = buildDefaultStarterCodeForFramework(category, framework);
  const effectiveStarterFiles = starterFiles.length ? starterFiles : defaultStarterFiles;

  const testCases = [];
  for (const [index, tc] of (manifest.testCases || []).entries()) {
    let testCode = typeof tc.testCode === 'string' ? tc.testCode : undefined;
    if (!testCode && tc.testCodePath) {
      testCode = await readZipText(tc.testCodePath);
    }
    testCases.push({
      id: tc.id || `tc_${String(index + 1).padStart(3, '0')}`,
      name: tc.name || `Test Case ${index + 1}`,
      description: tc.description || undefined,
      file: tc.file || `tests/test_${index + 1}.${fallbackLanguage === 'python' ? 'py' : fallbackLanguage === 'java' ? 'java' : 'js'}`,
      testName: tc.testName || `test_case_${index + 1}`,
      testCode: testCode || undefined,
      points: Number(tc.points ?? 0) || 0,
      visible: tc.visible ?? true,
      category: tc.category || undefined
    });
  }

  const totalPoints = testCases.reduce((sum, tc) => sum + (Number(tc.points) || 0), 0) || Math.max(10, Number(manifest.points ?? defaults?.points ?? 100));
  const passing = Math.max(1, Math.ceil(totalPoints * 0.6));

  const testConfig: any = {
    framework,
    version: framework === 'junit' ? '5' : 'latest',
    environment: {},
    setup: { commands: ['echo "setup"'], timeout: 120000 },
    execution: { command: 'echo "run tests"', timeout: 300000 },
    testCases,
    scoring: { total: totalPoints, passing }
  };

  if (framework === 'pytest') {
    testConfig.environment = { python: '3.11' };
    testConfig.setup.commands = ['pip install pytest'];
    testConfig.execution.command = 'pytest -q';
  } else if (framework === 'junit') {
    testConfig.environment = { java: '17' };
    testConfig.setup.commands = ['echo "JUnit setup handled by executor"'];
    testConfig.execution.command = 'mvn test';
  } else if (framework === 'playwright') {
    testConfig.environment = { node: '20', runtime: 'browser' };
    testConfig.setup.commands = ['npm install'];
    testConfig.execution.command = 'npx playwright test';
  } else if (framework === 'cypress') {
    testConfig.environment = { node: '20', runtime: 'browser' };
    testConfig.setup.commands = ['npm install'];
    testConfig.execution.command = 'npx cypress run';
  } else if (framework === 'mocha') {
    testConfig.environment = { node: '20' };
    testConfig.setup.commands = ['npm install'];
    testConfig.execution.command = 'npx mocha';
  } else {
    testConfig.environment = { node: '20' };
    testConfig.setup.commands = ['npm install'];
    testConfig.execution.command = 'npx jest --runInBand';
  }

  return {
    title: String(manifest.title || 'Imported Question'),
    description: String(manifest.description || ''),
    category,
    subcategory: [],
    difficulty,
    skills: Array.isArray(manifest.skills) ? manifest.skills : [],
    tags: Array.isArray(manifest.tags) ? manifest.tags : [],
    starterCode: {
      files: effectiveStarterFiles,
      dependencies: {},
      scripts: {}
    },
    testFramework: framework,
    testConfig,
    solution: solutionFiles.length ? { files: solutionFiles } : undefined,
    timeEstimate: Math.max(5, Number(manifest.timeEstimate ?? defaults?.timeEstimate ?? 45)),
    points: Math.max(10, Number(manifest.points ?? defaults?.points ?? totalPoints))
  };
}

// ============================================================================
// GET QUESTION
// ============================================================================

export async function getQuestion(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  const question = await dbGetQuestionById(db, id);

  if (!question) {
    throw new QuestionNotFoundError(id);
  }

  // Check organization access
  if (question.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Cannot access question from another organization');
  }

  return question;
}

// ============================================================================
// GET QUESTION PREVIEW (Student View)
// ============================================================================

export async function getQuestionPreview(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<QuestionPreview> {
  const question = await getQuestion(db, id, context);

  // Filter out solution and hidden test cases
  const visibleTestCases = question.testConfig.testCases
    .filter(tc => tc.visible)
    .map(tc => ({
      id: tc.id,
      name: tc.name,
      description: tc.description,
      points: tc.points
    }));

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    category: question.category,
    difficulty: question.difficulty,
    skills: question.skills,
    tags: question.tags,
    starterCode: question.starterCode,
    timeEstimate: question.timeEstimate,
    points: question.points,
    visibleTestCases,
    totalTestCases: question.testConfig.testCases.length
  };
}

// ============================================================================
// LIST QUESTIONS
// ============================================================================

export async function listQuestions(
  db: any,
  filters: QuestionFilters,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<QuestionListResponse> {
  // Validate filters
  const validation = validateQuestionFilters(filters);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid filters',
      validation.error.errors
    );
  }

  const validatedFilters = validation.data;

  // Get questions for this organization
  const result = await dbListQuestions(
    db,
    context.organizationId,
    validatedFilters
  );

  return result;
}

// ============================================================================
// UPDATE QUESTION
// ============================================================================

export async function updateQuestion(
  db: any,
  id: string,
  data: UpdateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions
  if (
    context.userRole !== 'admin' &&
    existingQuestion.createdBy !== context.userId
  ) {
    throw new UnauthorizedError('Cannot update question created by another user');
  }

  // Validate update data
  const validation = validateUpdateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid update data',
      validation.error.errors
    );
  }

  const validatedData = validation.data;

  // If test config is being updated, validate test cases
  if (validatedData.testConfig) {
    const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
    if (!testCaseValidation.valid) {
      throw new QuestionValidationError(
        'Invalid test cases configuration',
        testCaseValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // If solution is being updated, validate it
  if (validatedData.solution) {
    const starterCode = validatedData.starterCode || existingQuestion.starterCode;
    const solutionValidation = validateSolution(starterCode, validatedData.solution);
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // Update question
  const updatedQuestion = await dbUpdateQuestion(db, id, validatedData as any);

  if (!updatedQuestion) {
    throw new QuestionNotFoundError(id);
  }

  return updatedQuestion;
}

// ============================================================================
// UPDATE QUESTION STATUS
// ============================================================================

export async function updateQuestionStatus(
  db: any,
  id: string,
  status: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions for status changes
  if (status === 'published' || status === 'archived') {
    if (context.userRole !== 'admin') {
      throw new UnauthorizedError('Only admins can publish or archive questions');
    }
  }

  // Update status
  const updatedQuestion = await dbUpdateQuestion(db, id, { status: status as any });

  if (!updatedQuestion) {
    throw new QuestionNotFoundError(id);
  }

  return updatedQuestion;
}

// ============================================================================
// DELETE QUESTION
// ============================================================================

export async function deleteQuestion(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<void> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions
  if (context.userRole !== 'admin') {
    throw new UnauthorizedError('Only admins can delete questions');
  }

  // Soft delete (archive)
  const success = await dbDeleteQuestion(db, id);

  if (!success) {
    throw new QuestionNotFoundError(id);
  }
}

// Backward-compatible alias used by assessment service
export const getQuestionById = getQuestion;

// ============================================================================
// CLONE QUESTION
// ============================================================================

export async function cloneQuestion(
  db: any,
  id: string,
  newTitle: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get original question
  const original = await getQuestion(db, id, context);

  // Generate new slug
  const baseSlug = generateSlug(newTitle);
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create cloned question
  const clonedQuestion = await dbCreateQuestion(db, {
    title: newTitle,
    description: original.description,
    category: original.category,
    subcategory: original.subcategory,
    difficulty: original.difficulty,
    skills: original.skills,
    tags: original.tags,
    starterCode: original.starterCode,
    testFramework: original.testFramework,
    testConfig: original.testConfig,
    solution: original.solution,
    timeEstimate: original.timeEstimate,
    points: original.points,
    organizationId: context.organizationId,
    createdBy: context.userId,
    slug
  });

  return clonedQuestion;
}

// ============================================================================
// BULK IMPORT
// ============================================================================

export async function bulkImportQuestions(
  db: any,
  questions: CreateQuestionDTO[],
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  },
  dryRun: boolean = false
): Promise<{
  success: number;
  failed: number;
  errors: any[];
  imported: Question[];
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
    imported: [] as Question[]
  };

  for (let i = 0; i < questions.length; i++) {
    try {
      const questionData = questions[i];

      if (!dryRun) {
        const question = await createQuestion(db, questionData, context);
        results.imported.push(question);
      }

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        index: i,
        question: questions[i],
        error: error.message,
        details: error.errors || []
      });
    }
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function slugExists(db: any, slug: string, excludeId?: string): Promise<boolean> {
  let query = db
    .selectFrom('questions')
    .select('id')
    .where('slug', '=', slug);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const result = await query.executeTakeFirst();
  return !!result;
}
