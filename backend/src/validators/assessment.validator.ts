/**
 * Assessment Validation Schemas
 * @module validators/assessment.validator
 */

import { z } from 'zod';

// ============================================================================
// ASSESSMENT SCHEMAS
// ============================================================================

const assessmentQuestionSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  orderIndex: z.number().int().min(1, 'Order index must start at 1'),
  pointsOverride: z.number().int().min(0).optional(),
  timeEstimateOverride: z.number().int().min(1).optional()
});

export const createAssessmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().optional(),
  instructions: z.string().optional(),
  labTemplateId: z.string().uuid('Invalid lab template ID'),
  timeLimitMinutes: z.number().int().min(5).max(480).optional(),
  passingScore: z.number().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  shuffleQuestions: z.boolean().default(false),
  showResultsImmediately: z.boolean().default(true),
  allowReviewAfterSubmission: z.boolean().default(true),
  requireWebcam: z.boolean().default(false),
  estimatedDurationMinutes: z.number().int().min(5).optional(),
  questions: z.array(assessmentQuestionSchema).min(1, 'At least one question required').optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  { message: 'End date must be after start date' }
);

export const updateAssessmentSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  labTemplateId: z.string().uuid().optional(),
  timeLimitMinutes: z.number().int().min(5).max(480).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  shuffleQuestions: z.boolean().optional(),
  showResultsImmediately: z.boolean().optional(),
  allowReviewAfterSubmission: z.boolean().optional(),
  requireWebcam: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

export const assignStudentsSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'At least one student required'),
  dueDate: z.string().datetime().optional(),
  reentryPolicy: z.enum(['resume_allowed', 'single_session']).optional()
});

export const assignmentFiltersSchema = z.object({
  assessmentId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(['assigned', 'in_progress', 'submitted', 'graded', 'expired']).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const updateAssignmentSchema = z.object({
  dueDate: z.string().datetime().nullable().optional(),
  reentryPolicy: z.enum(['resume_allowed', 'single_session']).optional(),
  clientAuditNotes: z.string().max(10000).nullable().optional(),
  coachingNotes: z.string().max(10000).nullable().optional()
}).refine(
  (data) =>
    data.dueDate !== undefined ||
    data.reentryPolicy !== undefined ||
    data.clientAuditNotes !== undefined ||
    data.coachingNotes !== undefined,
  { message: 'At least one updatable field is required' }
);

export const addQuestionsSchema = z.object({
  questions: z.array(assessmentQuestionSchema).min(1, 'At least one question required')
});

export const assessmentFiltersSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  labTemplateId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  search: z.string().min(2).optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type AssignStudentsInput = z.infer<typeof assignStudentsSchema>;
export type AddQuestionsInput = z.infer<typeof addQuestionsSchema>;
export type AssessmentFiltersInput = z.infer<typeof assessmentFiltersSchema>;
export type AssignmentFiltersInput = z.infer<typeof assignmentFiltersSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
