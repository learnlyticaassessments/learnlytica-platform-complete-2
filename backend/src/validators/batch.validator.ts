import { z } from 'zod';

export const batchTypeSchema = z.enum(['cohort', 'bootcamp', 'campus', 'team', 'hiring', 'custom']);
export const batchStatusSchema = z.enum(['active', 'archived']);
export const membershipStatusSchema = z.enum(['active', 'inactive']);
export const reentryPolicySchema = z.enum(['resume_allowed', 'single_session']);

export const createBatchSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(100).optional().or(z.literal('')).transform((v) => v || undefined),
  type: batchTypeSchema.default('custom'),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable()
}).refine((data) => {
  if (data.startDate && data.endDate) return new Date(data.endDate) >= new Date(data.startDate);
  return true;
}, { message: 'endDate must be on or after startDate' });

export const updateBatchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  code: z.string().min(2).max(100).nullable().optional(),
  type: batchTypeSchema.optional(),
  status: batchStatusSchema.optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })
  .refine((data) => {
    if (data.startDate && data.endDate) return new Date(data.endDate) >= new Date(data.startDate);
    return true;
  }, { message: 'endDate must be on or after startDate' });

export const listBatchesQuerySchema = z.object({
  search: z.string().min(1).optional(),
  status: batchStatusSchema.optional(),
  type: batchTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20)
});

export const batchIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const batchMemberParamsSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().uuid()
});

export const addBatchMembersSchema = z.object({
  learnerIds: z.array(z.string().uuid()).min(1),
  status: membershipStatusSchema.optional()
});

export const listBatchMembersQuerySchema = z.object({
  search: z.string().min(1).optional(),
  status: membershipStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const assignBatchAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
  reentryPolicy: reentryPolicySchema.default('resume_allowed')
});

export const listBatchResultsQuerySchema = z.object({
  assessmentId: z.string().uuid().optional(),
  status: z.enum(['assigned', 'in_progress', 'submitted', 'graded', 'expired']).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20)
});
