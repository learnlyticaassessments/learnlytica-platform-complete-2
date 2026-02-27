/**
 * Analytics Service
 * Data aggregation and reporting
 */

import { sql } from 'kysely';
import Anthropic from '@anthropic-ai/sdk';

let hasProjectSubmissionKindColumnCache: boolean | null = null;

async function hasProjectSubmissionKindColumn(db: any) {
  if (hasProjectSubmissionKindColumnCache != null) return hasProjectSubmissionKindColumnCache;
  const row = await db
    .selectFrom('information_schema.columns as c')
    .select(sql`count(*)`.as('count'))
    .where('c.table_schema', '=', 'public')
    .where('c.table_name', '=', 'project_submissions')
    .where('c.column_name', '=', 'submission_kind')
    .executeTakeFirst();
  hasProjectSubmissionKindColumnCache = Number((row as any)?.count || 0) > 0;
  return hasProjectSubmissionKindColumnCache;
}

function parseJsonMaybe<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function inferSkillsFromQuestion(title: string = '', difficulty: string = ''): string[] {
  const text = `${title} ${difficulty}`.toLowerCase();
  const skills = new Set<string>();
  if (/(array|string|loop|sort|search|algorithm|tree|graph|stack|queue)/.test(text)) skills.add('Algorithms');
  if (/(api|rest|http|endpoint|request|response|supertest)/.test(text)) skills.add('Backend API');
  if (/(react|ui|component|frontend|dom|css)/.test(text)) skills.add('Frontend UI');
  if (/(sql|database|query|schema|postgres)/.test(text)) skills.add('Database & SQL');
  if (/(full.?stack|workflow|integration|end.?to.?end|playwright)/.test(text)) skills.add('Full-Stack Workflow');
  if (!skills.size) skills.add('General Problem Solving');
  return [...skills];
}

function buildHeuristicSwot(matrix: any[]) {
  const sorted = [...matrix].sort((a, b) => b.averageScore - a.averageScore);
  const strengths = sorted.filter((s) => s.averageScore >= 80).slice(0, 3).map((s) => `${s.skill} (${s.averageScore.toFixed(1)}%)`);
  const weaknesses = [...sorted].reverse().filter((s) => s.averageScore < 70).slice(0, 3).map((s) => `${s.skill} (${s.averageScore.toFixed(1)}%)`);

  const opportunities = [
    weaknesses.length ? `Targeted practice in ${weaknesses.map((w) => w.split(' (')[0]).join(', ')}` : 'Advance into higher-complexity assessments',
    'Use review feedback and test output to create guided remediation tasks',
    'Increase timed assessments to improve consistency under pressure'
  ];
  const threats = [
    'Performance may drop in single-session locked attempts if weak areas remain unpracticed',
    'Low test-pass consistency can hide partial understanding until grading',
    'Context switching and focus interruptions may affect timed results'
  ];
  const recommendations = [
    ...weaknesses.map((w) => `Assign a focused practice set for ${w.split(' (')[0]} with immediate review enabled`),
    'Schedule one mixed-difficulty assessment to validate transfer of learning',
    'Review failed tests and convert common failures into coaching checkpoints'
  ].slice(0, 5);

  return { strengths, weaknesses, opportunities, threats, recommendations, source: 'heuristic' };
}

async function maybeGenerateAiSwot(matrix: any[], learner: any, summary: any) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `
You are an assessment analytics coach. Return strict JSON with keys:
strengths (string[]), weaknesses (string[]), opportunities (string[]), threats (string[]), recommendations (string[]).
Keep each item concise and actionable.

Learner:
${JSON.stringify(learner)}

Summary:
${JSON.stringify(summary)}

Skill Matrix:
${JSON.stringify(matrix)}
`;
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = (msg.content || []).map((c: any) => c.text || '').join('\n');
    const parsed = JSON.parse(text);
    return { ...parsed, source: 'ai' };
  } catch {
    return null;
  }
}

export async function getDashboardStats(db: any, organizationId: string) {
  const hasSubmissionKind = await hasProjectSubmissionKindColumn(db);
  const learnerKindFilter = hasSubmissionKind
    ? sql`coalesce(ps.submission_kind, 'learner_assignment') = 'learner_assignment'`
    : sql`true`;

  // Total counts
  const totals = await db
    .selectFrom('questions')
    .where('organization_id', '=', organizationId)
    .select([
      sql`count(*)`.as('totalQuestions'),
      sql`count(*) filter (where status = 'published')`.as('publishedQuestions')
    ])
    .executeTakeFirst();

  const assessmentStats = await db
    .selectFrom('assessments')
    .where('organization_id', '=', organizationId)
    .select([
      sql`count(*)`.as('totalAssessments'),
      sql`count(*) filter (where status = 'published')`.as('publishedAssessments')
    ])
    .executeTakeFirst();

  const studentStats = await db
    .selectFrom('student_assessments')
    .select([
      sql`count(distinct student_id)`.as('totalStudents'),
      sql`count(*)`.as('totalAttempts'),
      sql`count(*) filter (where status = 'submitted')`.as('completedAttempts'),
      sql`avg(score) filter (where score is not null)`.as('averageScore'),
      sql`count(*) filter (where passed = true)`.as('passedAttempts')
    ])
    .executeTakeFirst();

  const projectStats = await db
    .selectFrom('project_submissions as ps')
    .select([
      sql`count(*) filter (where ${learnerKindFilter})`.as('totalAssigned'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('submitted','preflight_completed','evaluation_queued','evaluation_completed','evaluation_failed'))`.as('submitted'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('evaluation_completed','evaluation_failed'))`.as('evaluated'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status = 'evaluation_completed')`.as('completed'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status = 'evaluation_failed')`.as('failed'),
      sql`avg(ps.latest_score) filter (where ${learnerKindFilter} and ps.latest_score is not null)`.as('averageScore')
    ])
    .where('ps.organization_id', '=', organizationId)
    .executeTakeFirst();

  const projectByTemplate = await db
    .selectFrom('project_submissions as ps')
    .innerJoin('project_assessments as pa', 'pa.id', 'ps.project_assessment_id')
    .innerJoin('project_evaluator_templates as pet', 'pet.id', 'pa.evaluator_template_id')
    .select([
      'pet.name as templateName',
      sql`count(*) filter (where ${learnerKindFilter})`.as('assigned'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('evaluation_completed','evaluation_failed'))`.as('evaluated'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status = 'evaluation_completed')`.as('passed'),
      sql`avg(ps.latest_score) filter (where ${learnerKindFilter} and ps.latest_score is not null)`.as('avgScore')
    ])
    .where('pa.organization_id', '=', organizationId)
    .groupBy('pet.name')
    .orderBy(sql`count(*) filter (where ${learnerKindFilter})`, 'desc')
    .execute();

  return {
    questions: {
      total: Number(totals?.totalQuestions || 0),
      published: Number(totals?.publishedQuestions || 0)
    },
    assessments: {
      total: Number(assessmentStats?.totalAssessments || 0),
      published: Number(assessmentStats?.publishedAssessments || 0)
    },
    students: {
      total: Number(studentStats?.totalStudents || 0),
      attempts: Number(studentStats?.totalAttempts || 0),
      completed: Number(studentStats?.completedAttempts || 0),
      averageScore: Number(studentStats?.averageScore || 0),
      passRate: studentStats?.totalAttempts > 0 
        ? (Number(studentStats.passedAttempts) / Number(studentStats.totalAttempts)) * 100 
        : 0
    },
    projects: {
      assigned: Number(projectStats?.totalAssigned || 0),
      submitted: Number(projectStats?.submitted || 0),
      evaluated: Number(projectStats?.evaluated || 0),
      completed: Number(projectStats?.completed || 0),
      failed: Number(projectStats?.failed || 0),
      averageScore: Number(projectStats?.averageScore || 0),
      completionRate: Number(projectStats?.totalAssigned || 0) > 0
        ? (Number(projectStats?.evaluated || 0) / Number(projectStats?.totalAssigned || 0)) * 100
        : 0,
      passRate: Number(projectStats?.evaluated || 0) > 0
        ? (Number(projectStats?.completed || 0) / Number(projectStats?.evaluated || 0)) * 100
        : 0,
      byTemplate: projectByTemplate.map((row: any) => ({
        templateName: row.templateName,
        assigned: Number(row.assigned || 0),
        evaluated: Number(row.evaluated || 0),
        passed: Number(row.passed || 0),
        averageScore: Number(row.avgScore || 0)
      }))
    }
  };
}

export async function getProjectEvaluationAnalytics(db: any, organizationId: string) {
  const stats = await getDashboardStats(db, organizationId);
  return stats.projects;
}

export async function getProjectAnalyticsDebug(db: any, organizationId: string) {
  const hasSubmissionKind = await hasProjectSubmissionKindColumn(db);

  const kindStatusRows = await db
    .selectFrom('project_submissions as ps')
    .select([
      (hasSubmissionKind ? sql`coalesce(ps.submission_kind, 'null')` : sql`'legacy_no_submission_kind'`).as('submissionKind'),
      sql`coalesce(ps.status, 'null')`.as('status'),
      sql`count(*)`.as('count')
    ])
    .where('ps.organization_id', '=', organizationId)
    .groupBy([
      hasSubmissionKind ? sql`coalesce(ps.submission_kind, 'null')` : sql`'legacy_no_submission_kind'`,
      sql`coalesce(ps.status, 'null')`
    ])
    .orderBy(sql`count(*)`, 'desc')
    .execute();

  const statusRows = await db
    .selectFrom('project_submissions as ps')
    .select([
      sql`coalesce(ps.status, 'null')`.as('status'),
      sql`count(*)`.as('count')
    ])
    .where('ps.organization_id', '=', organizationId)
    .groupBy(sql`coalesce(ps.status, 'null')`)
    .orderBy(sql`count(*)`, 'desc')
    .execute();

  const recentRows = await db
    .selectFrom('project_submissions as ps')
    .leftJoin('users as u', 'u.id', 'ps.student_id')
    .leftJoin('project_evaluation_runs as per', 'per.id', 'ps.latest_run_id')
    .select([
      'ps.id',
      (hasSubmissionKind ? sql`ps.submission_kind` : sql`null`).as('submissionKind'),
      'ps.status',
      'ps.latest_score as latestScore',
      'ps.submitted_at as submittedAt',
      'u.email as studentEmail',
      'per.runner_kind as runnerKind',
      'per.status as runStatus'
    ])
    .where('ps.organization_id', '=', organizationId)
    .orderBy('ps.submitted_at', 'desc')
    .limit(10)
    .execute();

  return {
    organizationId,
    totalProjectSubmissions: kindStatusRows.reduce((acc: number, row: any) => acc + Number(row.count || 0), 0),
    bySubmissionKindAndStatus: kindStatusRows.map((r: any) => ({
      submissionKind: r.submissionKind,
      status: r.status,
      count: Number(r.count || 0)
    })),
    byStatus: statusRows.map((r: any) => ({
      status: r.status,
      count: Number(r.count || 0)
    })),
    recentSubmissions: recentRows.map((r: any) => ({
      id: r.id,
      submissionKind: r.submissionKind || null,
      status: r.status || null,
      latestScore: r.latestScore == null ? null : Number(r.latestScore),
      submittedAt: r.submittedAt,
      studentEmail: r.studentEmail || null,
      runnerKind: r.runnerKind || null,
      runStatus: r.runStatus || null
    }))
  };
}

export async function getAssessmentAnalytics(db: any, assessmentId: string) {
  const stats = await db
    .selectFrom('student_assessments')
    .where('assessment_id', '=', assessmentId)
    .select([
      sql`count(*)`.as('totalAssigned'),
      sql`count(*) filter (where status = 'submitted')`.as('completed'),
      sql`count(*) filter (where status = 'in_progress')`.as('inProgress'),
      sql`avg(score) filter (where score is not null)`.as('avgScore'),
      sql`min(score) filter (where score is not null)`.as('minScore'),
      sql`max(score) filter (where score is not null)`.as('maxScore'),
      sql`avg(time_spent_minutes)`.as('avgTime'),
      sql`count(*) filter (where passed = true)`.as('passed')
    ])
    .executeTakeFirst();

  const scoreDistribution = await db
    .selectFrom('student_assessments')
    .where('assessment_id', '=', assessmentId)
    .where('score', 'is not', null)
    .select([
      sql`
        CASE
          WHEN score >= 90 THEN 'A'
          WHEN score >= 80 THEN 'B'
          WHEN score >= 70 THEN 'C'
          WHEN score >= 60 THEN 'D'
          ELSE 'F'
        END
      `.as('grade'),
      sql`count(*)`.as('count')
    ])
    .groupBy('grade')
    .execute();

  return {
    totalAssigned: Number(stats?.totalAssigned || 0),
    completed: Number(stats?.completed || 0),
    inProgress: Number(stats?.inProgress || 0),
    averageScore: Number(stats?.avgScore || 0),
    minScore: Number(stats?.minScore || 0),
    maxScore: Number(stats?.maxScore || 0),
    averageTime: Number(stats?.avgTime || 0),
    passRate: stats?.totalAssigned > 0 
      ? (Number(stats.passed) / Number(stats.totalAssigned)) * 100 
      : 0,
    scoreDistribution: scoreDistribution.map(d => ({
      grade: d.grade,
      count: Number(d.count)
    }))
  };
}

export async function getStudentReport(db: any, studentId: string) {
  const assessments = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'sa.assessment_id', 'a.id')
    .where('sa.student_id', '=', studentId)
    .select([
      'a.title as assessmentTitle',
      'sa.status',
      'sa.score',
      'sa.passed',
      'sa.started_at as startedAt',
      'sa.submitted_at as submittedAt',
      'sa.time_spent_minutes as timeSpent'
    ])
    .orderBy('sa.assigned_at', 'desc')
    .execute();

  const summary = await db
    .selectFrom('student_assessments')
    .where('student_id', '=', studentId)
    .select([
      sql`count(*)`.as('totalAssessments'),
      sql`count(*) filter (where status = 'submitted')`.as('completed'),
      sql`avg(score) filter (where score is not null)`.as('avgScore'),
      sql`count(*) filter (where passed = true)`.as('passed')
    ])
    .executeTakeFirst();

  return {
    assessments: assessments.map(a => ({
      title: a.assessmentTitle,
      status: a.status,
      score: a.score,
      passed: a.passed,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      timeSpent: a.timeSpent
    })),
    summary: {
      total: Number(summary?.totalAssessments || 0),
      completed: Number(summary?.completed || 0),
      averageScore: Number(summary?.avgScore || 0),
      passRate: summary?.totalAssessments > 0 
        ? (Number(summary.passed) / Number(summary.totalAssessments)) * 100 
        : 0
    }
  };
}

export async function exportToCsv(db: any, assessmentId: string) {
  const results = await db
    .selectFrom('student_assessments as sa')
    .where('sa.assessment_id', '=', assessmentId)
    .select([
      'sa.student_id as studentId',
      'sa.status',
      'sa.score',
      'sa.passed',
      'sa.attempt_number as attempt',
      'sa.started_at as started',
      'sa.submitted_at as submitted',
      'sa.time_spent_minutes as timeSpent'
    ])
    .execute();

  const headers = ['Student ID', 'Status', 'Score', 'Passed', 'Attempt', 'Started', 'Submitted', 'Time (min)'];
  const rows = results.map(r => [
    r.studentId,
    r.status,
    r.score || 'N/A',
    r.passed ? 'Yes' : 'No',
    r.attempt,
    r.started || 'N/A',
    r.submitted || 'N/A',
    r.timeSpent || 'N/A'
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export async function exportOrganizationAttemptsCsv(db: any, organizationId: string) {
  const rows = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'a.id', 'sa.assessment_id')
    .leftJoin('users as u', 'u.id', 'sa.student_id')
    .where('a.organization_id', '=', organizationId)
    .select([
      'sa.id as assignmentId',
      'u.full_name as learnerName',
      'u.email as learnerEmail',
      'a.title as assessmentTitle',
      'sa.status',
      'sa.score',
      'sa.passed',
      'sa.attempt_number as attemptNumber',
      'sa.reentry_policy as reentryPolicy',
      'sa.assigned_at as assignedAt',
      'sa.started_at as startedAt',
      'sa.submitted_at as submittedAt',
      'sa.time_spent_minutes as timeSpentMinutes'
    ])
    .orderBy('sa.assigned_at', 'desc')
    .execute();

  const headers = ['Assignment ID','Learner Name','Learner Email','Assessment','Status','Score','Passed','Attempt','Re-entry Policy','Assigned At','Started At','Submitted At','Time Spent (min)'];
  const csvRows = rows.map((r: any) => [
    r.assignmentId, r.learnerName || '', r.learnerEmail || '', r.assessmentTitle || '', r.status || '',
    r.score ?? '', r.passed == null ? '' : (r.passed ? 'Yes' : 'No'), r.attemptNumber ?? '',
    r.reentryPolicy || '', r.assignedAt || '', r.startedAt || '', r.submittedAt || '', r.timeSpentMinutes ?? ''
  ]);
  return [headers, ...csvRows]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export async function getProjectEvaluationTrends(db: any, organizationId: string, days = 14) {
  const hasSubmissionKind = await hasProjectSubmissionKindColumn(db);
  const learnerKindFilter = hasSubmissionKind
    ? sql`coalesce(ps.submission_kind, 'learner_assignment') = 'learner_assignment'`
    : sql`true`;
  const safeDays = Math.max(1, Math.min(60, Number(days) || 14));
  const trendDayExpr = sql`to_char(date_trunc('day', coalesce(ps.submitted_at, ps.assigned_at)), 'YYYY-MM-DD')`;
  const rows = await db
    .selectFrom('project_submissions as ps')
    .select([
      trendDayExpr.as('day'),
      sql`count(*) filter (where ${learnerKindFilter})`.as('assigned'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('submitted','preflight_completed','evaluation_queued','evaluation_completed','evaluation_failed'))`.as('submitted'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('evaluation_completed','evaluation_failed'))`.as('evaluated'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status = 'evaluation_completed')`.as('passed')
    ])
    .where('ps.organization_id', '=', organizationId)
    .where(sql`coalesce(ps.submitted_at, ps.assigned_at) >= now() - (${safeDays} * interval '1 day')`)
    .groupBy(trendDayExpr)
    .orderBy('day', 'asc')
    .execute();

  return rows.map((r: any) => ({
    day: r.day,
    assigned: Number(r.assigned || 0),
    submitted: Number(r.submitted || 0),
    evaluated: Number(r.evaluated || 0),
    passed: Number(r.passed || 0)
  }));
}

export async function getProjectBatchAnalytics(db: any, organizationId: string) {
  const hasSubmissionKind = await hasProjectSubmissionKindColumn(db);
  const learnerKindFilter = hasSubmissionKind
    ? sql`coalesce(ps.submission_kind, 'learner_assignment') = 'learner_assignment'`
    : sql`true`;
  const batchIdExpr = sql`coalesce(b.id::text, 'unbatched')`;
  const batchNameExpr = sql`coalesce(b.name, 'Unbatched / Direct Assignments')`;
  const rows = await db
    .selectFrom('project_submissions as ps')
    .leftJoin('batches as b', 'b.id', 'ps.assigned_batch_id')
    .select([
      batchIdExpr.as('batchId'),
      batchNameExpr.as('batchName'),
      sql`count(*) filter (where ${learnerKindFilter})`.as('assigned'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status in ('evaluation_completed','evaluation_failed'))`.as('evaluated'),
      sql`count(*) filter (where ${learnerKindFilter} and ps.status = 'evaluation_completed')`.as('passed'),
      sql`avg(ps.latest_score) filter (where ${learnerKindFilter} and ps.latest_score is not null)`.as('avgScore')
    ])
    .where('ps.organization_id', '=', organizationId)
    .groupBy([batchIdExpr, batchNameExpr])
    .orderBy(sql`count(*) filter (where ${learnerKindFilter})`, 'desc')
    .execute();

  return rows.map((r: any) => {
    const assigned = Number(r.assigned || 0);
    const evaluated = Number(r.evaluated || 0);
    const passed = Number(r.passed || 0);
    return {
      batchId: r.batchId,
      batchName: r.batchName,
      assigned,
      evaluated,
      passed,
      passRate: evaluated > 0 ? (passed / evaluated) * 100 : 0,
      averageScore: Number(r.avgScore || 0)
    };
  });
}

export async function exportProjectSummaryCsv(db: any, organizationId: string) {
  const dashboard = await getDashboardStats(db, organizationId);
  const trends = await getProjectEvaluationTrends(db, organizationId, 30);
  const byBatch = await getProjectBatchAnalytics(db, organizationId);
  const byTemplate = dashboard.projects?.byTemplate || [];

  const lines: any[][] = [];

  lines.push(['Section', 'Metric', 'Value']);
  lines.push(['Overview', 'Assigned', dashboard.projects?.assigned ?? 0]);
  lines.push(['Overview', 'Submitted', dashboard.projects?.submitted ?? 0]);
  lines.push(['Overview', 'Evaluated', dashboard.projects?.evaluated ?? 0]);
  lines.push(['Overview', 'Passed', dashboard.projects?.completed ?? 0]);
  lines.push(['Overview', 'Failed', dashboard.projects?.failed ?? 0]);
  lines.push(['Overview', 'Average Score', Number(dashboard.projects?.averageScore || 0).toFixed(2)]);
  lines.push(['Overview', 'Completion Rate %', Number(dashboard.projects?.completionRate || 0).toFixed(2)]);
  lines.push(['Overview', 'Pass Rate %', Number(dashboard.projects?.passRate || 0).toFixed(2)]);
  lines.push([]);

  lines.push(['Template', 'Assigned', 'Evaluated', 'Passed', 'Pass Rate %', 'Average Score']);
  for (const t of byTemplate) {
    const passRate = Number(t.evaluated || 0) > 0 ? (Number(t.passed || 0) / Number(t.evaluated || 0)) * 100 : 0;
    lines.push([
      t.templateName,
      Number(t.assigned || 0),
      Number(t.evaluated || 0),
      Number(t.passed || 0),
      passRate.toFixed(2),
      Number(t.averageScore || 0).toFixed(2)
    ]);
  }
  lines.push([]);

  lines.push(['Batch', 'Assigned', 'Evaluated', 'Passed', 'Pass Rate %', 'Average Score']);
  for (const b of byBatch) {
    lines.push([
      b.batchName,
      b.assigned,
      b.evaluated,
      b.passed,
      Number(b.passRate || 0).toFixed(2),
      Number(b.averageScore || 0).toFixed(2)
    ]);
  }
  lines.push([]);

  lines.push(['Day', 'Assigned', 'Submitted', 'Evaluated', 'Passed']);
  for (const t of trends) {
    lines.push([t.day, t.assigned, t.submitted, t.evaluated, t.passed]);
  }

  return lines
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export async function getStudentSkillMatrix(
  db: any,
  organizationId: string,
  studentId: string,
  options?: { includeAiSwot?: boolean }
) {
  const learner = await db
    .selectFrom('users')
    .select(['id', 'full_name as fullName', 'email'])
    .where('id', '=', studentId)
    .where('organization_id', '=', organizationId)
    .executeTakeFirst();
  if (!learner) throw new Error('Learner not found');

  const attempts = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'a.id', 'sa.assessment_id')
    .where('sa.student_id', '=', studentId)
    .where('a.organization_id', '=', organizationId)
    .where('sa.status', 'in', ['submitted', 'graded'] as any)
    .select([
      'sa.id',
      'sa.score',
      'sa.passed',
      'sa.review_payload as reviewPayload',
      'sa.submitted_at as submittedAt',
      'a.title as assessmentTitle'
    ])
    .orderBy('sa.submitted_at', 'desc')
    .execute();

  const skillStats = new Map<string, { skill: string; questionCount: number; testsRun: number; testsPassed: number; pointsEarned: number; totalPoints: number; scores: number[]; lastSeenAt?: string | null }>();

  for (const attempt of attempts) {
    const review = parseJsonMaybe<any>(attempt.reviewPayload, null);
    const questions = Array.isArray(review?.questions) ? review.questions : [];
    for (const q of questions) {
      const skills = inferSkillsFromQuestion(q.title, q.difficulty);
      for (const skill of skills) {
        const curr = skillStats.get(skill) || {
          skill,
          questionCount: 0,
          testsRun: 0,
          testsPassed: 0,
          pointsEarned: 0,
          totalPoints: 0,
          scores: [],
          lastSeenAt: null
        };
        curr.questionCount += 1;
        curr.testsRun += Number(q.testsRun || 0);
        curr.testsPassed += Number(q.testsPassed || 0);
        curr.pointsEarned += Number(q.pointsEarned || 0);
        curr.totalPoints += Number(q.totalPoints || 0);
        const qScore = Number(q.totalPoints || 0) > 0 ? (Number(q.pointsEarned || 0) / Number(q.totalPoints || 0)) * 100 : 0;
        curr.scores.push(qScore);
        curr.lastSeenAt = attempt.submittedAt || curr.lastSeenAt;
        skillStats.set(skill, curr);
      }
    }
  }

  const matrix = [...skillStats.values()].map((s) => {
    const averageScore = s.scores.length ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
    const testPassRate = s.testsRun > 0 ? (s.testsPassed / s.testsRun) * 100 : 0;
    const proficiency = averageScore >= 85 ? 'advanced' : averageScore >= 70 ? 'intermediate' : 'needs_improvement';
    return {
      skill: s.skill,
      questionCount: s.questionCount,
      testPassRate,
      averageScore,
      pointsEarned: s.pointsEarned,
      totalPoints: s.totalPoints,
      proficiency,
      lastSeenAt: s.lastSeenAt
    };
  }).sort((a, b) => b.averageScore - a.averageScore);

  const summary = {
    attemptsReviewed: attempts.length,
    overallAverageScore: attempts.length
      ? attempts.reduce((sum: number, a: any) => sum + Number(a.score || 0), 0) / attempts.length
      : 0,
    passRate: attempts.length
      ? (attempts.filter((a: any) => !!a.passed).length / attempts.length) * 100
      : 0,
    skillsTracked: matrix.length
  };

  const heuristic = buildHeuristicSwot(matrix);
  const ai = options?.includeAiSwot === false ? null : await maybeGenerateAiSwot(matrix, learner, summary);

  return {
    learner,
    summary,
    matrix,
    swot: ai || heuristic
  };
}

export async function exportSkillMatrixCsv(db: any, organizationId: string) {
  const learners = await db
    .selectFrom('users')
    .select(['id', 'full_name as fullName', 'email'])
    .where('organization_id', '=', organizationId)
    .where('role', '=', 'student')
    .execute();

  const lines: any[][] = [[
    'Learner ID','Learner Name','Email','Skill','Proficiency','Average Score','Test Pass Rate','Question Count','Points Earned','Total Points','Last Seen At'
  ]];

  for (const learner of learners) {
    try {
      const report = await getStudentSkillMatrix(db, organizationId, learner.id, { includeAiSwot: false });
      for (const skill of report.matrix) {
        lines.push([
          learner.id,
          learner.fullName || '',
          learner.email || '',
          skill.skill,
          skill.proficiency,
          skill.averageScore.toFixed(2),
          skill.testPassRate.toFixed(2),
          skill.questionCount,
          skill.pointsEarned,
          skill.totalPoints,
          skill.lastSeenAt || ''
        ]);
      }
    } catch {
      // skip learner if malformed data
    }
  }

  return lines
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
