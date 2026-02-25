/**
 * Assessment Database Model
 * Type-safe database queries for assessments
 * @module models/assessment.model
 */

import { sql } from 'kysely';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function rowToAssessment(row: any): any {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    labTemplateId: row.lab_template_id,
    timeLimitMinutes: row.time_limit_minutes,
    passingScore: parseFloat(row.passing_score),
    maxAttempts: row.max_attempts,
    startDate: row.start_date,
    endDate: row.end_date,
    shuffleQuestions: row.shuffle_questions,
    showResultsImmediately: row.show_results_immediately,
    allowReviewAfterSubmission: row.allow_review_after_submission,
    requireWebcam: row.require_webcam,
    status: row.status,
    totalPoints: row.total_points,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    createdBy: row.created_by,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createAssessment(db: any, data: any): Promise<any> {
  const result = await db
    .insertInto('assessments')
    .values({
      organization_id: data.organizationId,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      lab_template_id: data.labTemplateId,
      time_limit_minutes: data.timeLimitMinutes,
      passing_score: data.passingScore || 70,
      max_attempts: data.maxAttempts || 1,
      start_date: data.startDate,
      end_date: data.endDate,
      shuffle_questions: data.shuffleQuestions || false,
      show_results_immediately: data.showResultsImmediately ?? true,
      allow_review_after_submission: data.allowReviewAfterSubmission ?? true,
      require_webcam: data.requireWebcam || false,
      estimated_duration_minutes: data.estimatedDurationMinutes,
      created_by: data.createdBy,
      status: 'draft'
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return rowToAssessment(result);
}

// ============================================================================
// READ
// ============================================================================

export async function getAssessmentById(
  db: any,
  id: string,
  options?: { includeQuestions?: boolean; includeLabTemplate?: boolean }
): Promise<any> {
  const assessment = await db
    .selectFrom('assessments')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!assessment) return null;

  const result = rowToAssessment(assessment);

  // Include questions if requested
  if (options?.includeQuestions) {
    result.questions = await getAssessmentQuestions(db, id);
  }

  // Include lab template if requested
  if (options?.includeLabTemplate) {
    const template = await db
      .selectFrom('lab_templates')
      .selectAll()
      .where('id', '=', assessment.lab_template_id)
      .executeTakeFirst();
    result.labTemplate = template;
  }

  return result;
}

export async function listAssessments(
  db: any,
  organizationId: string,
  filters?: any
): Promise<{ assessments: any[]; total: number; page: number; limit: number }> {
  let query = db
    .selectFrom('assessments')
    .where('organization_id', '=', organizationId);

  // Apply filters
  if (filters?.status) {
    query = query.where('status', '=', filters.status);
  }

  if (filters?.labTemplateId) {
    query = query.where('lab_template_id', '=', filters.labTemplateId);
  }

  if (filters?.createdBy) {
    query = query.where('created_by', '=', filters.createdBy);
  }

  if (filters?.search) {
    query = query.where(sql`
      to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ 
      plainto_tsquery('english', ${filters.search})
    `);
  }

  // Get total count
  const countResult = await query
    .select(sql`count(*)`.as('count'))
    .executeTakeFirst();
  const total = Number(countResult?.count || 0);

  // Apply pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  query = query.orderBy('created_at', 'desc');

  const results = await query.selectAll().limit(limit).offset(offset).execute();

  return {
    assessments: results.map(rowToAssessment),
    total,
    page,
    limit
  };
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateAssessment(
  db: any,
  id: string,
  data: any
): Promise<any> {
  const updateData: any = {};

  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.instructions !== undefined) updateData.instructions = data.instructions;
  if (data.labTemplateId) updateData.lab_template_id = data.labTemplateId;
  if (data.timeLimitMinutes) updateData.time_limit_minutes = data.timeLimitMinutes;
  if (data.passingScore) updateData.passing_score = data.passingScore;
  if (data.maxAttempts) updateData.max_attempts = data.maxAttempts;
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.endDate !== undefined) updateData.end_date = data.endDate;
  if (data.shuffleQuestions !== undefined) updateData.shuffle_questions = data.shuffleQuestions;
  if (data.showResultsImmediately !== undefined) updateData.show_results_immediately = data.showResultsImmediately;
  if (data.allowReviewAfterSubmission !== undefined) updateData.allow_review_after_submission = data.allowReviewAfterSubmission;
  if (data.requireWebcam !== undefined) updateData.require_webcam = data.requireWebcam;
  if (data.status) {
    updateData.status = data.status;
    if (data.status === 'published') {
      updateData.published_at = new Date();
    }
  }

  const result = await db
    .updateTable('assessments')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return result ? rowToAssessment(result) : null;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteAssessment(db: any, id: string): Promise<boolean> {
  const result = await db
    .deleteFrom('assessments')
    .where('id', '=', id)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
}

// ============================================================================
// ASSESSMENT QUESTIONS
// ============================================================================

export async function addQuestions(
  db: any,
  assessmentId: string,
  questions: Array<{ questionId: string; orderIndex: number; pointsOverride?: number }>
): Promise<void> {
  const values = questions.map(q => ({
    assessment_id: assessmentId,
    question_id: q.questionId,
    order_index: q.orderIndex,
    points_override: q.pointsOverride
  }));

  await db.insertInto('assessment_questions').values(values).execute();
}

export async function getAssessmentQuestions(db: any, assessmentId: string): Promise<any[]> {
  const results = await db
    .selectFrom('assessment_questions')
    .selectAll()
    .where('assessment_id', '=', assessmentId)
    .orderBy('order_index', 'asc')
    .execute();

  return results.map((row: any) => ({
    id: row.id,
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    orderIndex: row.order_index,
    pointsOverride: row.points_override
  }));
}

export async function removeQuestion(
  db: any,
  assessmentId: string,
  questionId: string
): Promise<boolean> {
  const result = await db
    .deleteFrom('assessment_questions')
    .where('assessment_id', '=', assessmentId)
    .where('question_id', '=', questionId)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
}

// ============================================================================
// STUDENT ASSIGNMENTS
// ============================================================================

export async function assignToStudents(
  db: any,
  assessmentId: string,
  studentIds: string[],
  assignedBy: string,
  dueDate?: Date
): Promise<void> {
  // Get total points for the assessment
  const assessment = await getAssessmentById(db, assessmentId);

  const values = studentIds.map(studentId => ({
    assessment_id: assessmentId,
    student_id: studentId,
    assigned_by: assignedBy,
    due_date: dueDate,
    total_points: assessment.totalPoints
  }));

  await db.insertInto('student_assessments').values(values).execute();
}

export async function getAssessmentStatistics(db: any, assessmentId: string): Promise<any> {
  const stats = await db
    .selectFrom('student_assessments')
    .where('assessment_id', '=', assessmentId)
    .select([
      sql`count(*)`.as('totalAssigned'),
      sql`count(*) filter (where status = 'submitted')`.as('completed'),
      sql`count(*) filter (where status = 'in_progress')`.as('inProgress'),
      sql`count(*) filter (where status = 'assigned')`.as('notStarted'),
      sql`avg(score) filter (where score is not null)`.as('averageScore'),
      sql`count(*) filter (where passed = true)`.as('passed'),
      sql`avg(time_spent_minutes)`.as('averageTimeSpent')
    ])
    .executeTakeFirst();

  const totalAssigned = Number(stats?.totalAssigned || 0);
  const passed = Number(stats?.passed || 0);
  const passRate = totalAssigned > 0 ? (passed / totalAssigned) * 100 : 0;

  return {
    totalAssigned,
    completed: Number(stats?.completed || 0),
    inProgress: Number(stats?.inProgress || 0),
    notStarted: Number(stats?.notStarted || 0),
    averageScore: Number(stats?.averageScore || 0),
    passRate,
    averageTimeSpent: Number(stats?.averageTimeSpent || 0)
  };
}
