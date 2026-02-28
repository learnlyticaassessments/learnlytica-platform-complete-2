/**
 * Question Validation Schemas using Zod
 * @module validators/question.validator
 */

import { z } from 'zod';
import type { QuestionCategory, QuestionDifficulty, TestFramework } from '../../shared/types/question.types';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const questionCategorySchema = z.enum([
  'frontend',
  'backend',
  'fullstack',
  'database',
  'devops'
]);

const questionDifficultySchema = z.enum(['easy', 'medium', 'hard']);
const questionProblemStyleSchema = z.enum([
  'algorithmic',
  'scenario_driven',
  'debugging',
  'implementation',
  'optimization',
  'design_tradeoff'
]);

const testFrameworkSchema = z.enum([
  'playwright',
  'jest',
  'pytest',
  'junit',
  'mocha',
  'cypress'
]);

const questionStatusSchema = z.enum(['draft', 'review', 'published', 'archived']);

// ============================================================================
// CODE FILE SCHEMA
// ============================================================================

const codeFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string(),
  language: z.string().optional(),
  readOnly: z.boolean().optional()
});

// ============================================================================
// STARTER CODE SCHEMA
// ============================================================================

const starterCodeSchema = z.object({
  files: z.array(codeFileSchema).min(1, 'At least one file is required'),
  dependencies: z.record(z.string(), z.string()),
  scripts: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional()
}).refine(
  (data) => data.files.length > 0,
  { message: 'Starter code must include at least one file' }
);

// ============================================================================
// TEST CONFIGURATION SCHEMA
// ============================================================================

const testEnvironmentSchema = z.object({
  node: z.string().optional(),
  python: z.string().optional(),
  java: z.string().optional(),
  runtime: z.string().optional()
});

const testSetupSchema = z.object({
  commands: z.array(z.string()).min(1, 'At least one setup command required'),
  startServer: z.string().optional(),
  waitForServer: z.string().url().optional(),
  timeout: z.number().positive().optional()
});

const testExecutionSchema = z.object({
  command: z.string().min(1, 'Execution command is required'),
  timeout: z.number().positive().default(300000), // 5 minutes
  retries: z.number().int().min(0).max(3).optional(),
  parallelism: z.boolean().optional()
});

const testCaseSchema = z.object({
  id: z.string().min(1, 'Test case ID is required'),
  name: z.string().min(1, 'Test case name is required'),
  description: z.string().optional(),
  file: z.string().min(1, 'Test file path is required'),
  testName: z.string().min(1, 'Test name is required'),
  testCode: z.string().optional(),
  points: z.number().int().min(0, 'Points must be non-negative'),
  visible: z.boolean(),
  category: z.string().optional(),
  timeout: z.number().positive().optional()
});

const testScoringSchema = z.object({
  total: z.number().int().positive('Total points must be positive'),
  passing: z.number().int().positive('Passing threshold must be positive'),
  categories: z.record(z.string(), z.number().int().positive()).optional()
}).refine(
  (data) => data.passing <= data.total,
  { message: 'Passing threshold cannot exceed total points' }
);

const testConfigSchema = z.object({
  framework: testFrameworkSchema,
  version: z.string().min(1, 'Framework version is required'),
  environment: testEnvironmentSchema,
  setup: testSetupSchema,
  execution: testExecutionSchema,
  testCases: z.array(testCaseSchema).min(1, 'At least one test case required'),
  scoring: testScoringSchema
}).refine(
  (data) => {
    // Verify total points in scoring matches sum of test case points
    const testCaseTotal = data.testCases.reduce((sum, tc) => sum + tc.points, 0);
    return testCaseTotal === data.scoring.total;
  },
  { message: 'Total points in scoring must match sum of test case points' }
);

// ============================================================================
// SOLUTION SCHEMA
// ============================================================================

const complexitySchema = z.object({
  time: z.string(),
  space: z.string()
});

const solutionSchema = z.object({
  files: z.array(codeFileSchema).min(1, 'Solution must include at least one file'),
  explanation: z.string().optional(),
  approach: z.string().optional(),
  complexity: complexitySchema.optional(),
  notes: z.array(z.string()).optional()
});

// ============================================================================
// CREATE QUESTION SCHEMA
// ============================================================================

export const createQuestionSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(500, 'Title must not exceed 500 characters'),
  
  description: z.string()
    .min(20, 'Description must be at least 20 characters'),
  
  category: questionCategorySchema,
  problemStyle: questionProblemStyleSchema.optional().default('implementation'),
  technicalFocus: z.string().min(2).max(100).optional(),
  
  subcategory: z.array(z.string()).optional().default([]),
  
  difficulty: questionDifficultySchema,
  
  skills: z.array(z.string()).optional().default([]),
  
  tags: z.array(z.string()).optional().default([]),
  
  starterCode: starterCodeSchema,
  
  testFramework: testFrameworkSchema,
  
  testConfig: testConfigSchema,
  
  solution: solutionSchema.optional(),
  
  timeEstimate: z.number()
    .int()
    .min(5, 'Time estimate must be at least 5 minutes')
    .max(180, 'Time estimate must not exceed 180 minutes'),
  
  points: z.number()
    .int()
    .min(10, 'Points must be at least 10')
    .max(500, 'Points must not exceed 500')
    .optional()
    .default(100)
}).refine(
  (data) => {
    // Verify test framework matches test config framework
    return data.testFramework === data.testConfig.framework;
  },
  { message: 'Test framework must match test config framework' }
);

// ============================================================================
// UPDATE QUESTION SCHEMA
// ============================================================================

export const updateQuestionSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(500, 'Title must not exceed 500 characters')
    .optional(),
  
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .optional(),
  
  category: questionCategorySchema.optional(),
  problemStyle: questionProblemStyleSchema.optional(),
  technicalFocus: z.string().min(2).max(100).optional(),
  
  subcategory: z.array(z.string()).optional(),
  
  difficulty: questionDifficultySchema.optional(),
  
  skills: z.array(z.string()).optional(),
  
  tags: z.array(z.string()).optional(),
  
  starterCode: starterCodeSchema.optional(),
  
  testFramework: testFrameworkSchema.optional(),
  
  testConfig: testConfigSchema.optional(),
  
  solution: solutionSchema.optional(),
  
  timeEstimate: z.number()
    .int()
    .min(5)
    .max(180)
    .optional(),
  
  points: z.number()
    .int()
    .min(10)
    .max(500)
    .optional(),
  
  status: questionStatusSchema.optional()
}).refine(
  (data) => {
    // If both testFramework and testConfig are provided, they must match
    if (data.testFramework && data.testConfig) {
      return data.testFramework === data.testConfig.framework;
    }
    return true;
  },
  { message: 'Test framework must match test config framework' }
);

// ============================================================================
// QUERY/FILTER SCHEMA
// ============================================================================

export const questionFiltersSchema = z.object({
  // Filtering
  category: questionCategorySchema.optional(),
  problemStyle: questionProblemStyleSchema.optional(),
  technicalFocus: z.string().min(2).max(100).optional(),
  difficulty: questionDifficultySchema.optional(),
  status: questionStatusSchema.optional(),
  curriculum: z.string().min(2).max(100).optional(),
  testFramework: testFrameworkSchema.optional(),
  skills: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().uuid().optional(),
  
  // Search
  search: z.string().min(2, 'Search term must be at least 2 characters').optional(),
  
  // Pagination
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'difficulty', 'points']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// ============================================================================
// STATUS UPDATE SCHEMA
// ============================================================================

export const updateStatusSchema = z.object({
  status: questionStatusSchema,
  message: z.string().optional()
});

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const reviewRequestSchema = z.object({
  message: z.string().min(10, 'Review message must be at least 10 characters').optional()
});

export const reviewResponseSchema = z.object({
  action: z.enum(['approve', 'reject']),
  feedback: z.string().min(10, 'Feedback must be at least 10 characters').optional()
});

// ============================================================================
// BULK OPERATIONS SCHEMAS
// ============================================================================

export const bulkImportSchema = z.object({
  questions: z.array(createQuestionSchema).min(1, 'At least one question required'),
  dryRun: z.boolean().optional().default(false)
});

export const bulkExportSchema = z.object({
  filters: questionFiltersSchema.optional(),
  includeSolutions: z.boolean().optional().default(false),
  format: z.enum(['json', 'csv']).optional().default('json')
});

export const draftTestRunSchema = z.object({
  question: createQuestionSchema,
  code: z.string().optional(),
  useSolution: z.boolean().optional().default(true)
});

export const draftPackageValidateSchema = z.object({
  question: createQuestionSchema
});

// ============================================================================
// ID PARAMETER SCHEMA
// ============================================================================

export const questionIdSchema = z.object({
  id: z.string().uuid('Invalid question ID format')
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type QuestionFiltersInput = z.infer<typeof questionFiltersSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type BulkExportInput = z.infer<typeof bulkExportSchema>;
export type DraftTestRunInput = z.infer<typeof draftTestRunSchema>;
export type DraftPackageValidateInput = z.infer<typeof draftPackageValidateSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create question data
 */
export function validateCreateQuestion(data: unknown) {
  return createQuestionSchema.safeParse(data);
}

/**
 * Validate update question data
 */
export function validateUpdateQuestion(data: unknown) {
  return updateQuestionSchema.safeParse(data);
}

/**
 * Validate question filters
 */
export function validateQuestionFilters(data: unknown) {
  return questionFiltersSchema.safeParse(data);
}

/**
 * Validate question ID
 */
export function validateQuestionId(id: string) {
  return questionIdSchema.safeParse({ id });
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
}

/**
 * Validate test cases configuration
 */
export function validateTestCases(testCases: z.infer<typeof testCaseSchema>[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for duplicate test case IDs
  const ids = testCases.map(tc => tc.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate test case IDs found: ${duplicateIds.join(', ')}`);
  }
  
  // Check that at least one test case is visible
  const visibleCount = testCases.filter(tc => tc.visible).length;
  if (visibleCount === 0) {
    errors.push('At least one test case must be visible to students');
  }
  
  // Verify total points
  const totalPoints = testCases.reduce((sum, tc) => sum + tc.points, 0);
  if (totalPoints === 0) {
    errors.push('Total test case points must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate solution matches starter code structure
 */
export function validateSolution(
  starterCode: z.infer<typeof starterCodeSchema>,
  solution: z.infer<typeof solutionSchema>
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check that solution has at least the same files as starter code
  const starterPaths = starterCode.files.map(f => f.path);
  const solutionPaths = solution.files.map(f => f.path);
  
  const missingPaths = starterPaths.filter(path => !solutionPaths.includes(path));
  if (missingPaths.length > 0) {
    errors.push(`Solution missing files: ${missingPaths.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
