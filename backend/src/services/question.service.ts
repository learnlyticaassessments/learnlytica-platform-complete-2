/**
 * Question Service Layer
 * Business logic for question management
 * @module services/question.service
 */

import {
  createQuestion as dbCreateQuestion,
  getQuestionById as dbGetQuestionById,
  listQuestions as dbListQuestions,
  updateQuestion as dbUpdateQuestion,
  deleteQuestion as dbDeleteQuestion,
  rowToQuestion
} from '../models/question.model';
import {
  validateCreateQuestion,
  validateUpdateQuestion,
  validateQuestionFilters,
  generateSlug,
  validateTestCases,
  validateSolution,
  type CreateQuestionInput,
  type UpdateQuestionInput,
  type QuestionFiltersInput
} from '../validators/question.validator';
import type {
  Question,
  QuestionListResponse,
  QuestionPreview,
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionFilters
} from '../../shared/types/question.types';

// ============================================================================
// ERRORS
// ============================================================================

export class QuestionNotFoundError extends Error {
  constructor(id: string) {
    super(`Question not found: ${id}`);
    this.name = 'QuestionNotFoundError';
  }
}

export class QuestionValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'QuestionValidationError';
  }
}

export class QuestionSlugExistsError extends Error {
  constructor(slug: string) {
    super(`Question with slug '${slug}' already exists`);
    this.name = 'QuestionSlugExistsError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ============================================================================
// CREATE QUESTION
// ============================================================================

export async function createQuestion(
  db: any,
  data: CreateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Validate input
  const validation = validateCreateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid question data',
      validation.error.errors
    );
  }

  const validatedData = validation.data;

  // Validate test cases
  const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
  if (!testCaseValidation.valid) {
    throw new QuestionValidationError(
      'Invalid test cases configuration',
      testCaseValidation.errors.map(e => ({ message: e }))
    );
  }

  // Validate solution if provided
  if (validatedData.solution) {
    const solutionValidation = validateSolution(
      validatedData.starterCode,
      validatedData.solution
    );
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // Generate unique slug
  const baseSlug = generateSlug(validatedData.title);
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create question
  const question = await dbCreateQuestion(db, {
    ...validatedData,
    organizationId: context.organizationId,
    createdBy: context.userId,
    slug
  } as any);

  return question;
}

// ============================================================================
// GET QUESTION
// ============================================================================

export async function getQuestion(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  const question = await dbGetQuestionById(db, id);

  if (!question) {
    throw new QuestionNotFoundError(id);
  }

  // Check organization access
  if (question.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Cannot access question from another organization');
  }

  return question;
}

// ============================================================================
// GET QUESTION PREVIEW (Student View)
// ============================================================================

export async function getQuestionPreview(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<QuestionPreview> {
  const question = await getQuestion(db, id, context);

  // Filter out solution and hidden test cases
  const visibleTestCases = question.testConfig.testCases
    .filter(tc => tc.visible)
    .map(tc => ({
      id: tc.id,
      name: tc.name,
      description: tc.description,
      points: tc.points
    }));

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    category: question.category,
    difficulty: question.difficulty,
    skills: question.skills,
    tags: question.tags,
    starterCode: question.starterCode,
    timeEstimate: question.timeEstimate,
    points: question.points,
    visibleTestCases,
    totalTestCases: question.testConfig.testCases.length
  };
}

// ============================================================================
// LIST QUESTIONS
// ============================================================================

export async function listQuestions(
  db: any,
  filters: QuestionFilters,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<QuestionListResponse> {
  // Validate filters
  const validation = validateQuestionFilters(filters);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid filters',
      validation.error.errors
    );
  }

  const validatedFilters = validation.data;

  // Get questions for this organization
  const result = await dbListQuestions(
    db,
    context.organizationId,
    validatedFilters
  );

  return result;
}

// ============================================================================
// UPDATE QUESTION
// ============================================================================

export async function updateQuestion(
  db: any,
  id: string,
  data: UpdateQuestionDTO,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions
  if (
    context.userRole !== 'admin' &&
    existingQuestion.createdBy !== context.userId
  ) {
    throw new UnauthorizedError('Cannot update question created by another user');
  }

  // Validate update data
  const validation = validateUpdateQuestion(data);
  if (!validation.success) {
    throw new QuestionValidationError(
      'Invalid update data',
      validation.error.errors
    );
  }

  const validatedData = validation.data;

  // If test config is being updated, validate test cases
  if (validatedData.testConfig) {
    const testCaseValidation = validateTestCases(validatedData.testConfig.testCases);
    if (!testCaseValidation.valid) {
      throw new QuestionValidationError(
        'Invalid test cases configuration',
        testCaseValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // If solution is being updated, validate it
  if (validatedData.solution) {
    const starterCode = validatedData.starterCode || existingQuestion.starterCode;
    const solutionValidation = validateSolution(starterCode, validatedData.solution);
    if (!solutionValidation.valid) {
      throw new QuestionValidationError(
        'Invalid solution',
        solutionValidation.errors.map(e => ({ message: e }))
      );
    }
  }

  // Update question
  const updatedQuestion = await dbUpdateQuestion(db, id, validatedData as any);

  if (!updatedQuestion) {
    throw new QuestionNotFoundError(id);
  }

  return updatedQuestion;
}

// ============================================================================
// UPDATE QUESTION STATUS
// ============================================================================

export async function updateQuestionStatus(
  db: any,
  id: string,
  status: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions for status changes
  if (status === 'published' || status === 'archived') {
    if (context.userRole !== 'admin') {
      throw new UnauthorizedError('Only admins can publish or archive questions');
    }
  }

  // Update status
  const updatedQuestion = await dbUpdateQuestion(db, id, { status: status as any });

  if (!updatedQuestion) {
    throw new QuestionNotFoundError(id);
  }

  return updatedQuestion;
}

// ============================================================================
// DELETE QUESTION
// ============================================================================

export async function deleteQuestion(
  db: any,
  id: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<void> {
  // Get existing question
  const existingQuestion = await getQuestion(db, id, context);

  // Check permissions
  if (context.userRole !== 'admin') {
    throw new UnauthorizedError('Only admins can delete questions');
  }

  // Soft delete (archive)
  const success = await dbDeleteQuestion(db, id);

  if (!success) {
    throw new QuestionNotFoundError(id);
  }
}

// Backward-compatible alias used by assessment service
export const getQuestionById = getQuestion;

// ============================================================================
// CLONE QUESTION
// ============================================================================

export async function cloneQuestion(
  db: any,
  id: string,
  newTitle: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  }
): Promise<Question> {
  // Get original question
  const original = await getQuestion(db, id, context);

  // Generate new slug
  const baseSlug = generateSlug(newTitle);
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create cloned question
  const clonedQuestion = await dbCreateQuestion(db, {
    title: newTitle,
    description: original.description,
    category: original.category,
    subcategory: original.subcategory,
    difficulty: original.difficulty,
    skills: original.skills,
    tags: original.tags,
    starterCode: original.starterCode,
    testFramework: original.testFramework,
    testConfig: original.testConfig,
    solution: original.solution,
    timeEstimate: original.timeEstimate,
    points: original.points,
    organizationId: context.organizationId,
    createdBy: context.userId,
    slug
  });

  return clonedQuestion;
}

// ============================================================================
// BULK IMPORT
// ============================================================================

export async function bulkImportQuestions(
  db: any,
  questions: CreateQuestionDTO[],
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
  },
  dryRun: boolean = false
): Promise<{
  success: number;
  failed: number;
  errors: any[];
  imported: Question[];
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
    imported: [] as Question[]
  };

  for (let i = 0; i < questions.length; i++) {
    try {
      const questionData = questions[i];

      if (!dryRun) {
        const question = await createQuestion(db, questionData, context);
        results.imported.push(question);
      }

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        index: i,
        question: questions[i],
        error: error.message,
        details: error.errors || []
      });
    }
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function slugExists(db: any, slug: string, excludeId?: string): Promise<boolean> {
  let query = db
    .selectFrom('questions')
    .select('id')
    .where('slug', '=', slug);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const result = await query.executeTakeFirst();
  return !!result;
}
