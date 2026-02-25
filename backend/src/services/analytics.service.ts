/**
 * Analytics Service
 * Data aggregation and reporting
 */

import { sql } from 'kysely';

export async function getDashboardStats(db: any, organizationId: string) {
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
    }
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
