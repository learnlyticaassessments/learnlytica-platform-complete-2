/**
 * Student Assessment Service (Updated with real execution)
 */

import * as assessmentModel from '../models/assessment.model';
import { runTests as runRealTests } from './test-runner.service';

export class StudentAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentAssessmentError';
  }
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
      'a.id as assessmentId',
      'a.title',
      'a.description',
      'a.time_limit_minutes as timeLimitMinutes',
      'a.total_points as totalPoints',
      'a.passing_score as passingScore'
    ])
    .orderBy('sa.assigned_at', 'desc')
    .execute();

  return results;
}

export async function getAssessmentToTake(db: any, studentAssessmentId: string, studentId: string) {
  const sa = await db
    .selectFrom('student_assessments')
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .selectAll()
    .executeTakeFirst();

  if (!sa) throw new StudentAssessmentError('Assessment not found');
  if (sa.status === 'submitted') throw new StudentAssessmentError('Assessment already submitted');

  const assessment = await assessmentModel.getAssessmentById(db, sa.assessment_id, {
    includeQuestions: true,
    includeLabTemplate: true
  });

  return { studentAssessment: sa, assessment };
}

export async function startAssessment(db: any, studentAssessmentId: string, studentId: string) {
  const result = await db
    .updateTable('student_assessments')
    .set({
      status: 'in_progress',
      started_at: new Date()
    })
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .where('status', '=', 'assigned')
    .returningAll()
    .executeTakeFirst();

  if (!result) throw new StudentAssessmentError('Cannot start assessment');
  return result;
}

export async function submitAssessment(
  db: any,
  studentAssessmentId: string,
  studentId: string,
  code: any,
  timeSpentMinutes: number
) {
  // Get assessment and questions
  const { assessment } = await getAssessmentToTake(db, studentAssessmentId, studentId);
  
  // Calculate score by running all tests
  let totalPoints = 0;
  let earnedPoints = 0;

  for (const aq of assessment.questions || []) {
    const question = aq.question;
    if (!question) continue;

    const testResult = await runRealTests(
      code[question.id] || '',
      question.testConfig,
      question
    );

    totalPoints += testResult.totalPoints;
    earnedPoints += testResult.pointsEarned;
  }

  const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  const result = await db
    .updateTable('student_assessments')
    .set({
      status: 'submitted',
      submitted_at: new Date(),
      score: finalScore,
      points_earned: earnedPoints,
      time_spent_minutes: timeSpentMinutes,
      passed: finalScore >= assessment.passingScore
    })
    .where('id', '=', studentAssessmentId)
    .where('student_id', '=', studentId)
    .where('status', '=', 'in_progress')
    .returningAll()
    .executeTakeFirst();

  if (!result) throw new StudentAssessmentError('Cannot submit assessment');
  return result;
}

// Run tests (now uses real execution)
export async function runTests(db: any, studentAssessmentId: string, studentId: string, questionId: string, code: string) {
  const { assessment } = await getAssessmentToTake(db, studentAssessmentId, studentId);
  
  const question = assessment.questions?.find((q: any) => q.questionId === questionId)?.question;
  if (!question) throw new StudentAssessmentError('Question not found');

  const result = await runRealTests(code, question.testConfig, question);
  return result;
}
