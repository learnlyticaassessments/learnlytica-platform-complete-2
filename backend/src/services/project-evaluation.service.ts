import type { Kysely } from 'kysely';

type Ctx = {
  organizationId: string;
  userId?: string | null;
  role?: string | null;
};

function nowIso() {
  return new Date().toISOString();
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

  const run = await db
    .insertInto('project_evaluation_runs')
    .values({
      project_submission_id: submissionId,
      organization_id: ctx.organizationId,
      status: 'queued',
      trigger_type: payload?.triggerType || 'manual',
      runner_kind: 'phase1_placeholder',
      framework_detected: submission.detectedFramework || 'react_vite',
      summary_json: {
        phase: 1,
        state: 'queued',
        message: 'Queued for Phase 1 Playwright UI-flow evaluation scaffold',
        nextStep: 'Runner orchestration service not yet wired'
      },
      result_json: null,
      logs_text: null,
      created_by: ctx.userId || null
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('project_submissions')
    .set({
      latest_run_id: (run as any).id,
      status: 'evaluation_queued',
      latest_summary_json: {
        runId: (run as any).id,
        status: 'queued',
        queuedAt: nowIso(),
        phase: 1
      }
    })
    .where('id', '=', submissionId)
    .execute();

  return run;
}
