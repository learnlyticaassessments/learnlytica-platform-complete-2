/**
 * Assessment Service
 * Business logic for assessment management
 * @module services/assessment.service
 */

import * as assessmentModel from '../models/assessment.model';
import * as labTemplateModel from '../models/lab-template.model';
import { getQuestionById } from './question.service';

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class AssessmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Assessment not found: ${id}`);
    this.name = 'AssessmentNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createAssessment(db: any, data: any, context: any) {
  // Admins and clients can create assessments
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to create assessments');
  }

  // Verify lab template exists and is active
  const labTemplate = await labTemplateModel.getLabTemplateById(db, data.labTemplateId);
  if (!labTemplate) {
    throw new ValidationError('Lab template not found');
  }
  if (!labTemplate.isActive) {
    throw new ValidationError('Lab template is not active');
  }

  // Verify all questions exist and are published
  if (data.questions && data.questions.length > 0) {
    for (const q of data.questions) {
      const question = await getQuestionById(db, q.questionId, context);
      if (!question) {
        throw new ValidationError(`Question ${q.questionId} not found`);
      }
      if (question.status !== 'published') {
        throw new ValidationError(`Question ${q.questionId} is not published`);
      }
    }
  }

  // Create assessment
  const assessment = await assessmentModel.createAssessment(db, {
    ...data,
    organizationId: context.organizationId,
    createdBy: context.userId
  });

  // Add questions if provided
  if (data.questions && data.questions.length > 0) {
    await assessmentModel.addQuestions(db, assessment.id, data.questions);
  }

  // Increment lab template usage count
  await labTemplateModel.incrementUsageCount(db, data.labTemplateId);

  return assessment;
}

// ============================================================================
// READ
// ============================================================================

export async function getAssessment(db: any, id: string, options: any, context: any) {
  const assessment = await assessmentModel.getAssessmentById(db, id, options);

  if (!assessment) {
    throw new AssessmentNotFoundError(id);
  }

  // Verify access
  if (assessment.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assessment');
  }

  return assessment;
}

export async function listAssessments(db: any, filters: any, context: any) {
  const result = await assessmentModel.listAssessments(
    db,
    context.organizationId,
    filters
  );

  return result;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateAssessment(db: any, id: string, data: any, context: any) {
  // Verify assessment exists and user has access
  const existing = await assessmentModel.getAssessmentById(db, id);
  if (!existing) {
    throw new AssessmentNotFoundError(id);
  }

  if (existing.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assessment');
  }

  // Only creator or admin can update
  if (existing.createdBy !== context.userId && context.userRole !== 'admin') {
    throw new UnauthorizedError('Only the creator or admin can update this assessment');
  }

  // If changing lab template, verify it exists
  if (data.labTemplateId && data.labTemplateId !== existing.labTemplateId) {
    const labTemplate = await labTemplateModel.getLabTemplateById(db, data.labTemplateId);
    if (!labTemplate || !labTemplate.isActive) {
      throw new ValidationError('Invalid or inactive lab template');
    }
  }

  const updated = await assessmentModel.updateAssessment(db, id, data);
  return updated;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteAssessment(db: any, id: string, context: any) {
  const existing = await assessmentModel.getAssessmentById(db, id);
  if (!existing) {
    throw new AssessmentNotFoundError(id);
  }

  if (existing.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assessment');
  }

  // Only creator or admin can delete
  if (existing.createdBy !== context.userId && context.userRole !== 'admin') {
    throw new UnauthorizedError('Only the creator or admin can delete this assessment');
  }

  const deleted = await assessmentModel.deleteAssessment(db, id);
  return deleted;
}

// ============================================================================
// QUESTIONS
// ============================================================================

export async function addQuestionsToAssessment(
  db: any,
  assessmentId: string,
  questions: any[],
  context: any
) {
  const assessment = await getAssessment(db, assessmentId, {}, context);

  // Verify all questions exist and are published
  for (const q of questions) {
    const question = await getQuestionById(db, q.questionId, context);
    if (!question || question.status !== 'published') {
      throw new ValidationError(`Invalid question: ${q.questionId}`);
    }
  }

  await assessmentModel.addQuestions(db, assessmentId, questions);
}

export async function removeQuestionFromAssessment(
  db: any,
  assessmentId: string,
  questionId: string,
  context: any
) {
  await getAssessment(db, assessmentId, {}, context);
  await assessmentModel.removeQuestion(db, assessmentId, questionId);
}

// ============================================================================
// STUDENT ASSIGNMENTS
// ============================================================================

export async function assignToStudents(
  db: any,
  assessmentId: string,
  data: any,
  context: any
) {
  const assessment = await getAssessment(db, assessmentId, {}, context);

  // Only published assessments can be assigned
  if (assessment.status !== 'published') {
    throw new ValidationError('Only published assessments can be assigned to students');
  }

  await assessmentModel.assignToStudents(
    db,
    assessmentId,
    data.studentIds,
    context.userId,
    data.dueDate,
    data.reentryPolicy || 'resume_allowed'
  );
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getAssessmentStatistics(db: any, assessmentId: string, context: any) {
  await getAssessment(db, assessmentId, {}, context);
  const stats = await assessmentModel.getAssessmentStatistics(db, assessmentId);
  return stats;
}

export async function listStudentAssignments(db: any, filters: any, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to view assignments');
  }

  return assessmentModel.listStudentAssignments(db, context.organizationId, filters);
}

export async function updateStudentAssignment(db: any, assignmentId: string, data: any, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to update assignments');
  }

  const existing = await assessmentModel.getStudentAssignmentById(db, assignmentId);
  if (!existing) {
    throw new AssessmentNotFoundError(assignmentId);
  }

  if (existing.assessment_organization_id !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assignment');
  }

  if (['submitted', 'graded'].includes(existing.status) && data.reentryPolicy) {
    throw new ValidationError('Cannot change re-entry policy after submission');
  }

  const updated = await assessmentModel.updateStudentAssignment(db, assignmentId, {
    dueDate: data.dueDate === undefined ? undefined : (data.dueDate ? new Date(data.dueDate) : null),
    reentryPolicy: data.reentryPolicy
  });

  return updated;
}

export async function revokeStudentAssignment(db: any, assignmentId: string, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to revoke assignments');
  }

  const existing = await assessmentModel.getStudentAssignmentById(db, assignmentId);
  if (!existing) {
    throw new AssessmentNotFoundError(assignmentId);
  }

  if (existing.assessment_organization_id !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assignment');
  }

  if (['submitted', 'graded'].includes(existing.status)) {
    throw new ValidationError('Cannot revoke a submitted or graded assignment');
  }

  await assessmentModel.revokeStudentAssignment(db, assignmentId);
}

export async function getStudentAssignmentReview(db: any, assignmentId: string, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to view assignment review');
  }

  const row = await assessmentModel.getStudentAssignmentReviewById(db, assignmentId);
  if (!row) {
    throw new AssessmentNotFoundError(assignmentId);
  }

  if (row.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assignment review');
  }

  if (!['submitted', 'graded'].includes(row.status)) {
    throw new ValidationError('Assignment has not been submitted yet');
  }

  const review = (() => {
    if (!row.reviewPayload) return null;
    if (typeof row.reviewPayload === 'string') {
      try {
        return JSON.parse(row.reviewPayload);
      } catch {
        return null;
      }
    }
    return row.reviewPayload;
  })();

  return {
    assignment: {
      id: row.studentAssessmentId,
      status: row.status,
      score: row.score == null ? null : Number(row.score),
      pointsEarned: row.pointsEarned == null ? null : Number(row.pointsEarned),
      totalPoints: row.totalPoints == null ? null : Number(row.totalPoints),
      timeSpentMinutes: row.timeSpentMinutes == null ? null : Number(row.timeSpentMinutes),
      passed: row.passed,
      submittedAt: row.submittedAt,
      reentryPolicy: row.reentryPolicy
    },
    learner: {
      id: row.studentId,
      fullName: row.learnerName,
      email: row.learnerEmail
    },
    assessment: {
      id: row.assessmentId,
      title: row.assessmentTitle,
      description: row.assessmentDescription,
      showResultsImmediately: row.showResultsImmediately,
      allowReviewAfterSubmission: row.allowReviewAfterSubmission
    },
    review
  };
}

export async function getStudentAssignmentDetail(db: any, assignmentId: string, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Insufficient permissions to view assignment details');
  }

  const row = await assessmentModel.getStudentAssignmentDetailById(db, assignmentId);
  if (!row) {
    throw new AssessmentNotFoundError(assignmentId);
  }
  if (row.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this assignment');
  }

  const parseJson = (value: any, fallback: any) => {
    if (value == null) return fallback;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return value;
  };

  const focusEvents = parseJson(row.focusEvents, []);
  const review = parseJson(row.reviewPayload, null);

  return {
    assignment: {
      id: row.studentAssessmentId,
      status: row.status,
      attemptNumber: row.attemptNumber,
      assignedAt: row.assignedAt,
      dueDate: row.dueDate,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      score: row.score == null ? null : Number(row.score),
      pointsEarned: row.pointsEarned == null ? null : Number(row.pointsEarned),
      totalPoints: row.totalPoints == null ? null : Number(row.totalPoints),
      timeSpentMinutes: row.timeSpentMinutes == null ? null : Number(row.timeSpentMinutes),
      passed: row.passed,
      reentryPolicy: row.reentryPolicy,
      sessionLockedAt: row.sessionLockedAt,
      hasActiveSession: !!row.activeSessionKey,
      draftUpdatedAt: row.draftUpdatedAt,
      lastActivityAt: row.lastActivityAt,
      focusEventCount: Array.isArray(focusEvents) ? focusEvents.length : 0,
      reviewAvailable: ['submitted', 'graded'].includes(row.status)
    },
    learner: {
      id: row.studentId,
      fullName: row.learnerName,
      email: row.learnerEmail
    },
    assessment: {
      id: row.assessmentId,
      title: row.assessmentTitle,
      description: row.assessmentDescription,
      timeLimitMinutes: row.timeLimitMinutes,
      passingScore: row.passingScore == null ? null : Number(row.passingScore),
      showResultsImmediately: row.showResultsImmediately,
      allowReviewAfterSubmission: row.allowReviewAfterSubmission
    },
    focusEvents,
    review
  };
}

// ============================================================================
// CLONE
// ============================================================================

export async function cloneAssessment(db: any, id: string, title: string, context: any) {
  const original = await getAssessment(db, id, { includeQuestions: true }, context);

  // Create new assessment with same settings
  const cloned = await createAssessment(
    db,
    {
      title: title || `${original.title} (Copy)`,
      description: original.description,
      instructions: original.instructions,
      labTemplateId: original.labTemplateId,
      timeLimitMinutes: original.timeLimitMinutes,
      passingScore: original.passingScore,
      maxAttempts: original.maxAttempts,
      shuffleQuestions: original.shuffleQuestions,
      showResultsImmediately: original.showResultsImmediately,
      allowReviewAfterSubmission: original.allowReviewAfterSubmission,
      requireWebcam: original.requireWebcam,
      questions: original.questions
    },
    context
  );

  return cloned;
}
