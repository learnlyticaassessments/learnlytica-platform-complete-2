import type { Kysely } from 'kysely';
import JSZip from 'jszip';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type Ctx = {
  organizationId: string;
  userId?: string | null;
  role?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function projectEvalStorageRoot() {
  return path.resolve(process.cwd(), 'storage', 'project-evaluations');
}

function extractJsonObject(output: string) {
  const text = String(output || '');
  const matches = text.match(/\{[\s\S]*\}/g);
  if (!matches?.length) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(matches[i]);
    } catch {
      // keep trying earlier matches
    }
  }
  return null;
}

function flattenPlaywrightTests(payload: any) {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];
  const suites = Array.isArray(payload?.suites) ? payload.suites : [];
  for (const suite of suites) {
    for (const spec of suite?.specs || []) {
      const title = spec?.title || 'Untitled test';
      const testRuns = Array.isArray(spec?.tests) ? spec.tests : [];
      const latest = testRuns[0]?.results?.[0];
      const passed = latest?.status === 'passed' || spec?.ok === true;
      const error = latest?.error?.message || latest?.errors?.[0]?.message || undefined;
      results.push({ name: title, passed, error });
    }
  }
  return results;
}

function buildPhase1TicketPortalPlaywrightSpec() {
  return `
const { test, expect } = require('playwright/test');

test('Loads ticket intake portal page', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await expect(page.getByRole('heading', { name: /support ticket intake portal/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /create ticket/i })).toBeVisible();
});

test('Creates ticket with valid data and shows success feedback', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByLabel(/customer name/i).fill('Riya Sharma');
  await page.getByLabel(/customer email/i).fill('riya@example.com');
  await page.getByLabel(/issue category/i).selectOption('technical');
  await page.getByLabel(/priority/i).selectOption('high');
  await page.getByLabel(/issue description/i).fill('Customer cannot access billing dashboard after login.');
  await page.getByRole('button', { name: /create ticket/i }).click();
  await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
});

test('Appends created ticket to Recent Tickets table with expected fields', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByLabel(/customer name/i).fill('Riya Sharma');
  await page.getByLabel(/customer email/i).fill('riya@example.com');
  await page.getByLabel(/issue category/i).selectOption('technical');
  await page.getByLabel(/priority/i).selectOption('high');
  await page.getByLabel(/issue description/i).fill('Customer cannot access billing dashboard after login.');
  await page.getByRole('button', { name: /create ticket/i }).click();
  const table = page.getByRole('table');
  await expect(table).toContainText('TKT-0001');
  await expect(table).toContainText('Riya Sharma');
  await expect(table).toContainText('technical');
  await expect(table).toContainText('high');
  await expect(table).toContainText('Open');
});
`;
}

function buildPhase1PlaywrightConfig() {
  return `
module.exports = {
  testDir: '.',
  timeout: 30000,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  },
  reporter: [['json', { outputFile: 'results.json' }]]
};
`;
}

async function runPhase1ReactViteBrowserEvaluation(zipPath: string) {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phase1-project-eval-'));
  const workspaceDir = path.join(tmpRoot, 'workspace');
  await fs.mkdir(workspaceDir, { recursive: true });

  try {
    const zipBuffer = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);

    await Promise.all(
      Object.entries(zip.files).map(async ([name, file]) => {
        const target = path.join(workspaceDir, name);
        if (file.dir) {
          await fs.mkdir(target, { recursive: true });
          return;
        }
        await fs.mkdir(path.dirname(target), { recursive: true });
        const content = await file.async('nodebuffer');
        await fs.writeFile(target, content);
      })
    );

    await fs.writeFile(path.join(workspaceDir, 'evaluator.phase1.spec.js'), buildPhase1TicketPortalPlaywrightSpec());
    await fs.writeFile(path.join(workspaceDir, 'playwright.config.cjs'), buildPhase1PlaywrightConfig());
    await fs.chmod(workspaceDir, 0o777);

    const dockerCmd = [
      'docker run',
      '--rm',
      '--cpus="2"',
      '--memory="2g"',
      `--volume "${workspaceDir}:/workspace"`,
      '--workdir /workspace',
      'learnlytica/executor-playwright:latest',
      `sh -lc "mkdir -p node_modules && ln -sfn /usr/lib/node_modules/playwright ./node_modules/playwright && \
npm install --no-fund --no-audit >/tmp/npm-install.log 2>&1 && \
(npm run dev -- --host 0.0.0.0 --port 4173 >/tmp/app.log 2>&1 &) && APP_PID=$! && \
for i in $(seq 1 45); do node -e \\"require('http').get('http://127.0.0.1:4173',r=>process.exit(r.statusCode?0:1)).on('error',()=>process.exit(1))\\" && break; sleep 1; done && \
playwright test evaluator.phase1.spec.js --config playwright.config.cjs; CODE=$?; \
[ -f results.json ] && cat results.json; echo '\\n---APP_LOG---'; cat /tmp/app.log || true; kill $APP_PID >/dev/null 2>&1 || true; exit $CODE"`
    ].join(' ');

    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const out = await execAsync(dockerCmd, { timeout: 6 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
      stdout = out.stdout || '';
      stderr = out.stderr || '';
    } catch (error: any) {
      stdout = error?.stdout || '';
      stderr = error?.stderr || '';
      exitCode = typeof error?.code === 'number' ? error.code : 1;
    }

    const durationMs = Date.now() - start;
    let payload: any = null;
    try {
      const resultsJsonPath = path.join(workspaceDir, 'results.json');
      const resultsText = await fs.readFile(resultsJsonPath, 'utf8');
      payload = JSON.parse(resultsText);
    } catch {
      payload = extractJsonObject([stdout, stderr].filter(Boolean).join('\n'));
    }
    const tests = payload ? flattenPlaywrightTests(payload) : [];
    const passed = tests.filter((t) => t.passed).length;
    const total = tests.length;
    const score = total ? Math.round((passed / total) * 100) : 0;
    const appLog = stdout.includes('---APP_LOG---') ? stdout.split('---APP_LOG---').pop()?.trim() : '';

    return {
      success: exitCode === 0 && total > 0 && passed === total,
      exitCode,
      durationMs,
      tests,
      testsPassed: passed,
      testsTotal: total,
      score,
      rawOutput: [stdout, stderr].filter(Boolean).join('\n'),
      appLog: appLog || null,
      parsedJson: payload || null
    };
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  }
}

type ZipDetectSummary = {
  detectedFramework: string;
  confidence: 'high' | 'medium' | 'low';
  packageName?: string | null;
  scripts?: Record<string, string>;
  checks: Array<{ key: string; label: string; passed: boolean; detail?: string }>;
  entryCount: number;
  topLevelEntries: string[];
};

async function parseZipAndDetect(buffer: Buffer): Promise<ZipDetectSummary> {
  const zip = await JSZip.loadAsync(buffer);
  const entryNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const lower = new Set(entryNames.map((n) => n.toLowerCase()));

  const has = (name: string) => lower.has(name.toLowerCase());
  const hasPrefix = (prefix: string) => entryNames.some((n) => n.toLowerCase().startsWith(prefix.toLowerCase()));
  const findAny = (...candidates: string[]) => entryNames.find((n) => candidates.some((c) => n.toLowerCase() === c.toLowerCase()));

  const checks: ZipDetectSummary['checks'] = [];
  let detectedFramework = 'unknown';
  let confidence: ZipDetectSummary['confidence'] = 'low';
  let packageName: string | null = null;
  let scripts: Record<string, string> = {};

  const packageJsonEntry = findAny('package.json');
  let packageJson: any = null;
  if (packageJsonEntry) {
    try {
      packageJson = JSON.parse(await zip.file(packageJsonEntry)!.async('string'));
      packageName = packageJson?.name || null;
      scripts = packageJson?.scripts || {};
    } catch {
      // ignore parse errors, keep checks below
    }
  }

  const hasViteConfig = entryNames.some((n) => /^vite\.config\.(ts|js|mjs|cjs)$/i.test(n));
  const hasAngularJson = has('angular.json');
  const hasNextConfig = entryNames.some((n) => /^next\.config\.(js|mjs|ts)$/i.test(n));
  const hasIndexHtml = has('index.html');
  const hasSrc = hasPrefix('src/');
  const hasMainFrontendEntry = entryNames.some((n) => /^src\/main\.(tsx|jsx|ts|js)$/i.test(n));

  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {})
  };
  const depNames = Object.keys(deps).map((d) => d.toLowerCase());
  const hasDep = (name: string) => depNames.includes(name.toLowerCase());

  if (hasAngularJson || hasDep('@angular/core')) {
    detectedFramework = 'angular';
    confidence = hasAngularJson ? 'high' : 'medium';
  } else if (hasNextConfig || hasDep('next')) {
    detectedFramework = 'nextjs';
    confidence = hasNextConfig ? 'high' : 'medium';
  } else if ((hasViteConfig || hasIndexHtml) && (hasDep('react') || hasDep('react-dom'))) {
    detectedFramework = 'react_vite';
    confidence = hasViteConfig && hasMainFrontendEntry ? 'high' : 'medium';
  } else if (hasViteConfig && (hasDep('vue') || hasDep('nuxt'))) {
    detectedFramework = 'vue_vite';
    confidence = 'medium';
  }

  checks.push({ key: 'package_json', label: 'package.json present', passed: !!packageJsonEntry });
  checks.push({ key: 'vite_config', label: 'Vite config present', passed: hasViteConfig });
  checks.push({ key: 'index_html', label: 'index.html present', passed: hasIndexHtml });
  checks.push({ key: 'src_dir', label: 'src directory present', passed: hasSrc });
  checks.push({ key: 'main_entry', label: 'src/main.* entry present', passed: hasMainFrontendEntry });
  checks.push({
    key: 'start_script',
    label: 'Start script detected',
    passed: Boolean(scripts.dev || scripts.start || scripts.preview),
    detail: scripts.dev || scripts.start || scripts.preview || ''
  });

  const topLevelEntries = Array.from(new Set(entryNames.map((n) => n.split('/')[0]))).slice(0, 20);
  return {
    detectedFramework,
    confidence,
    packageName,
    scripts,
    checks,
    entryCount: entryNames.length,
    topLevelEntries
  };
}

export async function listTemplates(db: Kysely<any>, ctx: Ctx) {
  const rows = await db
    .selectFrom('project_evaluator_templates')
    .select([
      'id',
      'organization_id as organizationId',
      'name',
      'slug',
      'description',
      'evaluator_type as evaluatorType',
      'target_kind as targetKind',
      'framework_family as frameworkFamily',
      'version',
      'is_active as isActive',
      'config_json as config',
      'created_at as createdAt'
    ])
    .where((eb: any) =>
      eb.or([
        eb('organization_id', 'is', null),
        eb('organization_id', '=', ctx.organizationId)
      ])
    )
    .where('is_active', '=', true)
    .orderBy('organization_id', 'desc')
    .orderBy('name', 'asc')
    .execute();

  return rows;
}

export async function createTemplate(db: Kysely<any>, ctx: Ctx, payload: any) {
  const name = String(payload?.name || '').trim();
  if (!name) throw new Error('Template name is required');
  const slug = String(payload?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  if (!slug) throw new Error('Template slug is required');

  const row = await db
    .insertInto('project_evaluator_templates')
    .values({
      organization_id: ctx.organizationId,
      name,
      slug,
      description: payload?.description ? String(payload.description) : null,
      evaluator_type: payload?.evaluatorType || 'playwright_ui_flow',
      target_kind: payload?.targetKind || 'frontend_zip',
      framework_family: payload?.frameworkFamily || 'react_vite',
      version: Number(payload?.version) || 1,
      is_active: payload?.isActive !== false,
      config_json: payload?.config || {},
      created_by: ctx.userId || null
    })
    .returningAll()
    .executeTakeFirst();

  return row;
}

export async function listAssessments(db: Kysely<any>, ctx: Ctx) {
  const rows = await db
    .selectFrom('project_assessments as pa')
    .innerJoin('project_evaluator_templates as pet', 'pet.id', 'pa.evaluator_template_id')
    .select([
      'pa.id',
      'pa.title',
      'pa.description',
      'pa.status',
      'pa.submission_mode as submissionMode',
      'pa.framework_scope as frameworkScope',
      'pa.time_limit_minutes as timeLimitMinutes',
      'pa.due_date as dueDate',
      'pa.allow_review as allowReview',
      'pa.created_at as createdAt',
      'pet.id as evaluatorTemplateId',
      'pet.name as evaluatorTemplateName',
      'pet.framework_family as evaluatorFrameworkFamily'
    ])
    .where('pa.organization_id', '=', ctx.organizationId)
    .orderBy('pa.created_at', 'desc')
    .execute();

  return rows;
}

export async function createAssessment(db: Kysely<any>, ctx: Ctx, payload: any) {
  const title = String(payload?.title || '').trim();
  if (!title) throw new Error('Assessment title is required');
  const evaluatorTemplateId = String(payload?.evaluatorTemplateId || '').trim();
  if (!evaluatorTemplateId) throw new Error('evaluatorTemplateId is required');

  const template = await db
    .selectFrom('project_evaluator_templates')
    .select(['id', 'organization_id', 'framework_family', 'target_kind'])
    .where('id', '=', evaluatorTemplateId)
    .executeTakeFirst();

  if (!template) throw new Error('Evaluator template not found');
  if (template.organization_id && template.organization_id !== ctx.organizationId) {
    throw new Error('Evaluator template does not belong to this organization');
  }

  const row = await db
    .insertInto('project_assessments')
    .values({
      organization_id: ctx.organizationId,
      title,
      description: payload?.description ? String(payload.description) : null,
      status: payload?.status || 'draft',
      evaluator_template_id: evaluatorTemplateId,
      submission_mode: payload?.submissionMode || 'zip_upload',
      framework_scope: payload?.frameworkScope || template.framework_family || 'react_vite',
      time_limit_minutes: payload?.timeLimitMinutes ? Number(payload.timeLimitMinutes) : null,
      due_date: payload?.dueDate ? new Date(payload.dueDate).toISOString() : null,
      allow_review: payload?.allowReview !== false,
      config_json: payload?.config || {},
      created_by: ctx.userId || null
    })
    .returningAll()
    .executeTakeFirst();

  return row;
}

export async function getAssessmentDetail(db: Kysely<any>, ctx: Ctx, assessmentId: string) {
  const assessment = await db
    .selectFrom('project_assessments as pa')
    .innerJoin('project_evaluator_templates as pet', 'pet.id', 'pa.evaluator_template_id')
    .select([
      'pa.id',
      'pa.organization_id as organizationId',
      'pa.title',
      'pa.description',
      'pa.status',
      'pa.submission_mode as submissionMode',
      'pa.framework_scope as frameworkScope',
      'pa.time_limit_minutes as timeLimitMinutes',
      'pa.due_date as dueDate',
      'pa.allow_review as allowReview',
      'pa.config_json as config',
      'pa.created_at as createdAt',
      'pet.id as evaluatorTemplateId',
      'pet.name as evaluatorTemplateName',
      'pet.description as evaluatorTemplateDescription',
      'pet.framework_family as evaluatorFrameworkFamily',
      'pet.target_kind as evaluatorTargetKind'
    ])
    .where('pa.id', '=', assessmentId)
    .where('pa.organization_id', '=', ctx.organizationId)
    .executeTakeFirst();

  if (!assessment) return null;

  const submissions = await db
    .selectFrom('project_submissions as ps')
    .leftJoin('users as u', 'u.id', 'ps.student_id')
    .leftJoin('project_evaluation_runs as per', 'per.id', 'ps.latest_run_id')
    .select([
      'ps.id',
      'ps.student_id as studentId',
      'u.full_name as studentName',
      'u.email as studentEmail',
      'ps.source_type as sourceType',
      'ps.repo_url as repoUrl',
      'ps.repo_branch as repoBranch',
      'ps.repo_commit_sha as repoCommitSha',
      'ps.detected_framework as detectedFramework',
      'ps.detected_backend as detectedBackend',
      'ps.status',
      'ps.submitted_at as submittedAt',
      'ps.latest_score as latestScore',
      'ps.latest_summary_json as latestSummary',
      'ps.assigned_batch_id as assignedBatchId',
      'per.id as latestRunId',
      'per.status as latestRunStatus',
      'per.created_at as latestRunCreatedAt'
    ])
    .where('ps.project_assessment_id', '=', assessmentId)
    .orderBy('ps.submitted_at', 'desc')
    .execute();

  return { ...assessment, submissions };
}

function inferFrontendFramework(input: any) {
  const hint = String(input?.frameworkHint || input?.detectedFramework || '').toLowerCase();
  if (hint.includes('angular')) return 'angular';
  if (hint.includes('next')) return 'nextjs';
  if (hint.includes('react')) return 'react_vite';
  if (hint.includes('vite')) return 'react_vite';
  if (hint.includes('vue')) return 'vue_vite';
  return 'react_vite';
}

export async function createSubmission(db: Kysely<any>, ctx: Ctx, assessmentId: string, payload: any) {
  const assessment = await db
    .selectFrom('project_assessments')
    .select(['id', 'organization_id', 'status'])
    .where('id', '=', assessmentId)
    .executeTakeFirst();
  if (!assessment || assessment.organization_id !== ctx.organizationId) throw new Error('Project assessment not found');

  const studentId = String(payload?.studentId || '').trim();
  if (!studentId) throw new Error('studentId is required');

  const student = await db
    .selectFrom('users')
    .select(['id', 'role', 'organization_id'])
    .where('id', '=', studentId)
    .executeTakeFirst();
  if (!student || student.role !== 'student' || student.organization_id !== ctx.organizationId) {
    throw new Error('Learner not found in this organization');
  }

  const sourceType = payload?.sourceType === 'github' ? 'github' : 'zip_upload';
  const row = await db
    .insertInto('project_submissions')
    .values({
      project_assessment_id: assessmentId,
      organization_id: ctx.organizationId,
      student_id: studentId,
      assigned_batch_id: payload?.assignedBatchId || null,
      source_type: sourceType,
      source_ref: payload?.sourceRef || null,
      repo_url: payload?.repoUrl || null,
      repo_branch: payload?.repoBranch || null,
      repo_commit_sha: payload?.repoCommitSha || null,
      detected_framework: inferFrontendFramework(payload),
      detected_backend: payload?.detectedBackend || null,
      status: 'submitted',
      metadata_json: {
        phase: 1,
        zipFileName: payload?.zipFileName || null,
        notes: payload?.notes || null,
        createdAt: nowIso()
      }
    })
    .returningAll()
    .executeTakeFirst();

  return row;
}

export async function getSubmission(db: Kysely<any>, ctx: Ctx, submissionId: string) {
  const submission = await db
    .selectFrom('project_submissions as ps')
    .innerJoin('project_assessments as pa', 'pa.id', 'ps.project_assessment_id')
    .leftJoin('users as u', 'u.id', 'ps.student_id')
    .select([
      'ps.id',
      'ps.project_assessment_id as projectAssessmentId',
      'pa.title as projectAssessmentTitle',
      'ps.organization_id as organizationId',
      'ps.student_id as studentId',
      'u.full_name as studentName',
      'u.email as studentEmail',
      'ps.source_type as sourceType',
      'ps.source_ref as sourceRef',
      'ps.repo_url as repoUrl',
      'ps.repo_branch as repoBranch',
      'ps.repo_commit_sha as repoCommitSha',
      'ps.detected_framework as detectedFramework',
      'ps.detected_backend as detectedBackend',
      'ps.status',
      'ps.submitted_at as submittedAt',
      'ps.latest_run_id as latestRunId',
      'ps.latest_score as latestScore',
      'ps.latest_summary_json as latestSummary',
      'ps.metadata_json as metadata'
    ])
    .where('ps.id', '=', submissionId)
    .where('ps.organization_id', '=', ctx.organizationId)
    .executeTakeFirst();

  if (!submission) return null;

  const runs = await db
    .selectFrom('project_evaluation_runs')
    .select([
      'id',
      'status',
      'trigger_type as triggerType',
      'runner_kind as runnerKind',
      'framework_detected as frameworkDetected',
      'started_at as startedAt',
      'completed_at as completedAt',
      'score',
      'max_score as maxScore',
      'summary_json as summary',
      'created_at as createdAt'
    ])
    .where('project_submission_id', '=', submissionId)
    .orderBy('created_at', 'desc')
    .execute();

  return { ...submission, runs };
}

export async function queueRun(db: Kysely<any>, ctx: Ctx, submissionId: string, payload: any) {
  const submission = await db
    .selectFrom('project_submissions as ps')
    .innerJoin('project_assessments as pa', 'pa.id', 'ps.project_assessment_id')
    .select([
      'ps.id',
      'ps.organization_id as organizationId',
      'ps.detected_framework as detectedFramework',
      'pa.evaluator_template_id as evaluatorTemplateId'
    ])
    .where('ps.id', '=', submissionId)
    .where('ps.organization_id', '=', ctx.organizationId)
    .executeTakeFirst();

  if (!submission) throw new Error('Project submission not found');

  const existingSubmission = await db
    .selectFrom('project_submissions')
    .select(['id', 'metadata_json as metadata', 'detected_framework as detectedFramework'])
    .where('id', '=', submissionId)
    .executeTakeFirst();
  if (!existingSubmission) throw new Error('Project submission not found');

  const metadata = (existingSubmission as any).metadata || {};
  const detect = metadata?.zipDetection;
  const zipLocalPath = metadata?.zipUpload?.localPath ? String(metadata.zipUpload.localPath) : null;
  const preflightChecks: Array<any> = Array.isArray(detect?.checks) ? detect.checks : [];
  const passCount = preflightChecks.filter((c) => c.passed).length;
  const totalCount = preflightChecks.length || 1;
  const score = Math.round((passCount / totalCount) * 100);
  const eligibleForActualPhase1 = Boolean(
    detect &&
    detect?.detectedFramework === 'react_vite' &&
    zipLocalPath
  );

  let actualRunResult: any = null;
  if (eligibleForActualPhase1) {
    try {
      actualRunResult = await runPhase1ReactViteBrowserEvaluation(zipLocalPath);
    } catch (error: any) {
      actualRunResult = {
        success: false,
        exitCode: 1,
        durationMs: 0,
        tests: [],
        testsPassed: 0,
        testsTotal: 0,
        score: 0,
        rawOutput: String(error?.message || error),
        appLog: null,
        parsedJson: null
      };
    }
  }

  const completed = Boolean(detect);
  const actualExecutionCompleted = Boolean(actualRunResult);

  const run = await db
    .insertInto('project_evaluation_runs')
    .values({
      project_submission_id: submissionId,
      organization_id: ctx.organizationId,
      status: actualExecutionCompleted ? (actualRunResult.success ? 'completed' : 'failed') : (completed ? 'completed' : 'queued'),
      trigger_type: payload?.triggerType || 'manual',
      runner_kind: actualExecutionCompleted ? 'phase1_react_vite_playwright' : 'phase1_preflight',
      framework_detected: submission.detectedFramework || existingSubmission.detectedFramework || 'react_vite',
      started_at: (completed || actualExecutionCompleted) ? nowIso() : null,
      completed_at: (completed || actualExecutionCompleted) ? nowIso() : null,
      score: actualExecutionCompleted ? actualRunResult.score : (completed ? score : null),
      max_score: (completed || actualExecutionCompleted) ? 100 : null,
      summary_json: {
        phase: 1,
        state: actualExecutionCompleted
          ? (actualRunResult.success ? 'browser_eval_complete' : 'browser_eval_failed')
          : completed ? 'preflight_complete' : 'queued',
        message: actualExecutionCompleted
          ? (actualRunResult.success
              ? 'Phase 1 React/Vite browser-flow evaluation completed'
              : 'Phase 1 React/Vite browser-flow evaluation failed')
          : completed
            ? 'ZIP ingestion + stack detection preflight completed (runner orchestration not yet wired for this submission)'
            : 'Queued for Phase 1 Playwright UI-flow evaluation scaffold',
        nextStep: actualExecutionCompleted ? 'Review failed steps/logs if any' : completed ? 'Submit React/Vite ZIP and run evaluation' : 'Upload ZIP and rerun',
        checksPassed: passCount,
        checksTotal: totalCount,
        testsPassed: actualRunResult?.testsPassed ?? null,
        testsTotal: actualRunResult?.testsTotal ?? null
      },
      result_json: actualExecutionCompleted
        ? {
            phase: 1,
            mode: 'browser_eval',
            detection: detect || null,
            tests: actualRunResult.tests,
            testsPassed: actualRunResult.testsPassed,
            testsTotal: actualRunResult.testsTotal,
            rawPlaywright: actualRunResult.parsedJson
          }
        : completed
          ? {
            phase: 1,
            mode: 'preflight',
            detection: detect || null,
            recommendation:
              (detect?.detectedFramework === 'react_vite' && score >= 70)
                ? 'Ready for Phase 1 runner orchestration implementation'
                : 'Submission structure incomplete for React/Vite Phase 1 expectations'
          }
        : null,
      logs_text: actualExecutionCompleted
        ? actualRunResult.rawOutput
        : completed
        ? `Phase 1 preflight completed. Detected framework: ${detect?.detectedFramework || 'unknown'} (${detect?.confidence || 'low'}).`
        : null,
      created_by: ctx.userId || null
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('project_submissions')
    .set({
      latest_run_id: (run as any).id,
      status: actualExecutionCompleted
        ? (actualRunResult.success ? 'evaluation_completed' : 'evaluation_failed')
        : completed ? 'preflight_completed' : 'evaluation_queued',
      latest_score: actualExecutionCompleted ? actualRunResult.score : (completed ? score : null),
      latest_summary_json: {
        runId: (run as any).id,
        status: actualExecutionCompleted
          ? (actualRunResult.success ? 'completed' : 'failed')
          : completed ? 'completed' : 'queued',
        queuedAt: nowIso(),
        phase: 1,
        mode: actualExecutionCompleted ? 'browser_eval' : completed ? 'preflight' : 'queue_only',
        score: actualExecutionCompleted ? actualRunResult.score : (completed ? score : null),
        testsPassed: actualRunResult?.testsPassed ?? null,
        testsTotal: actualRunResult?.testsTotal ?? null
      }
    })
    .where('id', '=', submissionId)
    .execute();

  return run;
}

export async function uploadSubmissionZip(
  db: Kysely<any>,
  ctx: Ctx,
  submissionId: string,
  file: { originalname?: string; buffer?: Buffer; size?: number }
) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) throw new Error('ZIP file is required');
  if ((file.size || file.buffer.length) > 25 * 1024 * 1024) throw new Error('ZIP file too large (max 25MB for Phase 1)');

  const submission = await db
    .selectFrom('project_submissions')
    .select(['id', 'organization_id as organizationId', 'metadata_json as metadata'])
    .where('id', '=', submissionId)
    .executeTakeFirst();
  if (!submission || (submission as any).organizationId !== ctx.organizationId) throw new Error('Project submission not found');

  const detection = await parseZipAndDetect(file.buffer);
  const storageDir = path.join(projectEvalStorageRoot(), submissionId);
  await fs.mkdir(storageDir, { recursive: true });
  const localZipPath = path.join(storageDir, 'source.zip');
  await fs.writeFile(localZipPath, file.buffer);

  const nextMetadata = {
    ...(((submission as any).metadata || {}) as Record<string, any>),
    zipUpload: {
      fileName: file.originalname || 'submission.zip',
      sizeBytes: file.size || file.buffer.length,
      uploadedAt: nowIso(),
      localPath: localZipPath
    },
    zipDetection: detection
  };

  await db
    .updateTable('project_submissions')
    .set({
      source_type: 'zip_upload',
      source_ref: `inline_zip:${file.originalname || 'submission.zip'}`,
      detected_framework: detection.detectedFramework,
      status: 'submitted',
      metadata_json: nextMetadata
    })
    .where('id', '=', submissionId)
    .execute();

  return {
    submissionId,
    fileName: file.originalname || 'submission.zip',
    sizeBytes: file.size || file.buffer.length,
    detection
  };
}
