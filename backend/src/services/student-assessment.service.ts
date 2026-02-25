/**
 * Student Assessment Service
 * Supports test execution, server-side drafts, review payloads, and re-entry/session policy
 */

import * as assessmentModel from '../models/assessment.model';
import { runTests as runRealTests } from './test-runner.service';

type ReentryPolicy = 'resume_allowed' | 'single_session';

export class StudentAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentAssessmentError';
  }
}

function normalizePolicy(value: string | null | undefined): ReentryPolicy {
  return value === 'single_session' ? 'single_session' : 'resume_allowed';
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

async function getStudentAssessmentRow(db: any, studentAssessmentId: string, studentId: string) {
  const sa = await db
    .selectFrom('student_assessments')
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .selectAll()
    .executeTakeFirst();

  if (!sa) throw new StudentAssessmentError('Assessment not found');
  return sa;
}

async function ensureAttemptSession(
  db: any,
  sa: any,
  sessionKey?: string | null
): Promise<any> {
  const policy = normalizePolicy(sa.reentry_policy);

  if (policy === 'resume_allowed') {
    if (!sa.active_session_key && sessionKey) {
      const updated = await db
        .updateTable('student_assessments')
        .set({ active_session_key: sessionKey, last_activity_at: new Date() })
        .where('id', '=', sa.id)
        .returningAll()
        .executeTakeFirst();
      return updated || sa;
    }
    return sa;
  }

  // single_session
  if (!sessionKey) {
    throw new StudentAssessmentError('Session key required for this assessment attempt');
  }

  if (sa.active_session_key && sa.active_session_key !== sessionKey) {
    throw new StudentAssessmentError('This attempt is locked to its original session/device');
  }

  if (!sa.active_session_key) {
    const updated = await db
      .updateTable('student_assessments')
      .set({
        active_session_key: sessionKey,
        session_locked_at: new Date(),
        last_activity_at: new Date()
      })
      .where('id', '=', sa.id)
      .returningAll()
      .executeTakeFirst();
    return updated || sa;
  }

  const touched = await db
    .updateTable('student_assessments')
    .set({ last_activity_at: new Date() })
    .where('id', '=', sa.id)
    .returningAll()
    .executeTakeFirst();
  return touched || sa;
}

export async function getMyAssessments(db: any, studentId: string) {
  const results = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'sa.assessment_id', 'a.id')
    .where('sa.student_id', '=', studentId)
    .select([
      'sa.id as studentAssessmentId',
      'sa.status',
      'sa.attempt_number as attemptNumber',
      'sa.due_date as dueDate',
      'sa.started_at as startedAt',
      'sa.submitted_at as submittedAt',
      'sa.score',
      'sa.reentry_policy as reentryPolicy',
      'a.id as assessmentId',
      'a.title',
      'a.description',
      'a.time_limit_minutes as timeLimitMinutes',
      'a.total_points as totalPoints',
      'a.passing_score as passingScore',
      'a.show_results_immediately as showResultsImmediately',
      'a.allow_review_after_submission as allowReviewAfterSubmission'
    ])
    .orderBy('sa.assigned_at', 'desc')
    .execute();

  return results;
}

export async function getAssessmentToTake(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  sessionKey?: string | null
) {
  let sa = await getStudentAssessmentRow(db, studentAssessmentId, studentId);
  if (sa.status === 'submitted') throw new StudentAssessmentError('Assessment already submitted');
  sa = await ensureAttemptSession(db, sa, sessionKey);

  const assessment = await assessmentModel.getAssessmentById(db, sa.assessment_id, {
    includeQuestions: true,
    includeLabTemplate: true
  });

  return {
    studentAssessment: sa,
    assessment,
    draftState: parseJsonMaybe(sa.draft_state, null),
    attemptConfig: {
      reentryPolicy: normalizePolicy(sa.reentry_policy)
    }
  };
}

export async function startAssessment(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  sessionKey?: string | null
) {
  let sa = await getStudentAssessmentRow(db, studentAssessmentId, studentId);
  sa = await ensureAttemptSession(db, sa, sessionKey);

  if (sa.status === 'in_progress') return sa;
  if (sa.status !== 'assigned') throw new StudentAssessmentError('Cannot start assessment');

  const result = await db
    .updateTable('student_assessments')
    .set({
      status: 'in_progress',
      started_at: new Date(),
      last_activity_at: new Date()
    })
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .where('status', '=', 'assigned')
    .returningAll()
    .executeTakeFirst();

  if (!result) throw new StudentAssessmentError('Cannot start assessment');
  return result;
}

export async function saveDraft(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  draftState: any,
  focusEvents: any[] = [],
  sessionKey?: string | null
) {
  let sa = await getStudentAssessmentRow(db, studentAssessmentId, studentId);
  if (sa.status === 'submitted') throw new StudentAssessmentError('Assessment already submitted');
  sa = await ensureAttemptSession(db, sa, sessionKey);

  const result = await db
    .updateTable('student_assessments')
    .set({
      draft_state: draftState ?? null,
      draft_updated_at: new Date(),
      focus_events: Array.isArray(focusEvents) ? JSON.stringify(focusEvents) : JSON.stringify([]),
      last_activity_at: new Date()
    } as any)
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .returning(['id', 'draft_updated_at'])
    .executeTakeFirst();

  return result;
}

export async function submitAssessment(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  code: any,
  timeSpentMinutes: number,
  sessionKey?: string | null
) {
  const { assessment, studentAssessment } = await getAssessmentToTake(db, studentAssessmentId, studentId, sessionKey);

  let totalPoints = 0;
  let earnedPoints = 0;
  const questionBreakdown: any[] = [];

  for (const aq of assessment.questions || []) {
    const question = aq.question;
    if (!question) continue;

    const submittedCode = code?.[question.id] || '';
    const testResult = await runRealTests(submittedCode, question.testConfig, question);

    totalPoints += testResult.totalPoints;
    earnedPoints += testResult.pointsEarned;

    questionBreakdown.push({
      questionId: question.id,
      title: question.title,
      difficulty: question.difficulty,
      points: question.points,
      testsRun: testResult.testsRun,
      testsPassed: testResult.testsPassed,
      totalPoints: testResult.totalPoints,
      pointsEarned: testResult.pointsEarned,
      results: testResult.results,
      output: testResult.output,
      executionTime: testResult.executionTime
    });
  }

  const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = finalScore >= assessment.passingScore;

  const reviewPayload = {
    generatedAt: new Date().toISOString(),
    score: finalScore,
    pointsEarned: earnedPoints,
    totalPoints,
    passed,
    timeSpentMinutes,
    focusEvents: Array.isArray(studentAssessment.focus_events)
      ? studentAssessment.focus_events
      : parseJsonMaybe(studentAssessment.focus_events, [] as any[]),
    questions: questionBreakdown
  };

  const result = await db
    .updateTable('student_assessments')
    .set({
      status: 'submitted',
      submitted_at: new Date(),
      score: finalScore,
      points_earned: earnedPoints,
      total_points: totalPoints,
      time_spent_minutes: timeSpentMinutes,
      passed,
      review_payload: JSON.stringify(reviewPayload),
      last_activity_at: new Date()
    } as any)
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .where('status', '!=', 'submitted')
    .returningAll()
    .executeTakeFirst();

  if (!result) throw new StudentAssessmentError('Cannot submit assessment');
  return result;
}

export async function runTests(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  questionId: string,
  code: string,
  sessionKey?: string | null
) {
  const { assessment } = await getAssessmentToTake(db, studentAssessmentId, studentId, sessionKey);

  const question = assessment.questions?.find((q: any) => q.questionId === questionId)?.question;
  if (!question) throw new StudentAssessmentError('Question not found');

  const result = await runRealTests(code, question.testConfig, question);
  return result;
}

export async function getSubmittedReview(
  db: any,
  studentAssessmentId: string,
  studentId: string
) {
  const row = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'sa.assessment_id', 'a.id')
    .where('sa.id', '=', studentAssessmentId)
    .where('sa.student_id', '=', studentId)
    .select([
      'sa.id as studentAssessmentId',
      'sa.status',
      'sa.score',
      'sa.points_earned as pointsEarned',
      'sa.total_points as totalPoints',
      'sa.time_spent_minutes as timeSpentMinutes',
      'sa.passed',
      'sa.submitted_at as submittedAt',
      'sa.review_payload as reviewPayload',
      'a.id as assessmentId',
      'a.title',
      'a.description',
      'a.show_results_immediately as showResultsImmediately',
      'a.allow_review_after_submission as allowReviewAfterSubmission'
    ])
    .executeTakeFirst();

  if (!row) throw new StudentAssessmentError('Assessment not found');
  if (row.status !== 'submitted' && row.status !== 'graded') {
    throw new StudentAssessmentError('Assessment has not been submitted yet');
  }
  if (!row.showResultsImmediately && !row.allowReviewAfterSubmission) {
    throw new StudentAssessmentError('Review is not available for this assessment');
  }

  return {
    studentAssessment: {
      id: row.studentAssessmentId,
      status: row.status,
      score: row.score,
      pointsEarned: row.pointsEarned,
      totalPoints: row.totalPoints,
      timeSpentMinutes: row.timeSpentMinutes,
      passed: row.passed,
      submittedAt: row.submittedAt
    },
    assessment: {
      id: row.assessmentId,
      title: row.title,
      description: row.description,
      showResultsImmediately: row.showResultsImmediately,
      allowReviewAfterSubmission: row.allowReviewAfterSubmission
    },
    review: parseJsonMaybe(row.reviewPayload, null)
  };
}
