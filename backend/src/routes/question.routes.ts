/**
 * Question Routes
 * Express router for question API endpoints
 * @module routes/question.routes
 */

import { Router } from 'express';
import * as questionController from '../controllers/question.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionFiltersSchema,
  updateStatusSchema,
  bulkImportSchema
} from '../validators/question.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// QUESTION CRUD ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/questions
 * @desc    Create a new question
 * @access  Private (Admin, Question Creator)
 */
router.post(
  '/',
  validateRequest(createQuestionSchema, 'body'),
  questionController.createQuestion
);

/**
 * @route   GET /api/v1/questions
 * @desc    List all questions with filters
 * @access  Private (All authenticated users)
 * @query   category, difficulty, status, search, page, limit, etc.
 */
router.get(
  '/',
  questionController.listQuestions
);

/**
 * @route   GET /api/v1/questions/:id
 * @desc    Get question by ID
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  questionController.getQuestion
);

/**
 * @route   GET /api/v1/questions/:id/preview
 * @desc    Get question preview (student view - no solution)
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id/preview',
  questionController.getQuestionPreview
);

/**
 * @route   PUT /api/v1/questions/:id
 * @desc    Update question
 * @access  Private (Admin or Question Creator who created it)
 */
router.put(
  '/:id',
  validateRequest(updateQuestionSchema, 'body'),
  questionController.updateQuestion
);

/**
 * @route   PATCH /api/v1/questions/:id/status
 * @desc    Update question status
 * @access  Private (Admin only for publish/archive)
 */
router.patch(
  '/:id/status',
  validateRequest(updateStatusSchema, 'body'),
  questionController.updateQuestionStatus
);

/**
 * @route   DELETE /api/v1/questions/:id
 * @desc    Delete question (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  questionController.deleteQuestion
);

// ============================================================================
// SPECIAL OPERATIONS
// ============================================================================

/**
 * @route   POST /api/v1/questions/:id/clone
 * @desc    Clone an existing question
 * @access  Private (Admin, Question Creator)
 */
router.post(
  '/:id/clone',
  questionController.cloneQuestion
);

/**
 * @route   POST /api/v1/questions/bulk-import
 * @desc    Bulk import questions
 * @access  Private (Admin only)
 */
router.post(
  '/bulk-import',
  validateRequest(bulkImportSchema, 'body'),
  questionController.bulkImport
);

export default router;
