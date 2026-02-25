/**
 * Lab Template Validation Schemas
 * @module validators/lab-template.validator
 */

import { z } from 'zod';

// ============================================================================
// LAB TEMPLATE SCHEMAS
// ============================================================================

const categorySchema = z.enum(['frontend', 'backend', 'fullstack', 'database', 'devops']);

const resourceLimitsSchema = z.object({
  cpu: z.string().regex(/^\d+(\.\d+)?$/, 'CPU must be a number (e.g., "2" or "1.5")'),
  memory: z.string().regex(/^\d+[GMK]i?$/, 'Memory must be in format like "4Gi" or "2G"'),
  storage: z.string().regex(/^\d+[GMK]i?$/, 'Storage must be in format like "10Gi"')
});

export const createLabTemplateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  description: z.string().optional(),
  category: categorySchema,
  dockerImage: z.string().min(1, 'Docker image is required'),
  dockerTag: z.string().default('latest'),
  dockerfileContent: z.string().optional(),
  vscodeExtensions: z.array(z.string()).default([]),
  vscodeSettings: z.record(z.any()).default({}),
  resourceLimits: resourceLimitsSchema,
  environmentVariables: z.record(z.string()).default({}),
  npmPackages: z.array(z.string()).default([]),
  pipPackages: z.array(z.string()).default([]),
  exposedPorts: z.array(z.number().int().min(1).max(65535)).default([])
});

export const updateLabTemplateSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  category: categorySchema.optional(),
  dockerImage: z.string().min(1).optional(),
  dockerTag: z.string().optional(),
  dockerfileContent: z.string().optional(),
  vscodeExtensions: z.array(z.string()).optional(),
  vscodeSettings: z.record(z.any()).optional(),
  resourceLimits: resourceLimitsSchema.optional(),
  environmentVariables: z.record(z.string()).optional(),
  npmPackages: z.array(z.string()).optional(),
  pipPackages: z.array(z.string()).optional(),
  exposedPorts: z.array(z.number().int().min(1).max(65535)).optional(),
  isActive: z.boolean().optional()
});

export type CreateLabTemplateInput = z.infer<typeof createLabTemplateSchema>;
export type UpdateLabTemplateInput = z.infer<typeof updateLabTemplateSchema>;
