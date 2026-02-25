/**
 * AI Question Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateQuestionHandler,
  generateAndCreateHandler,
  generateTestsHandler,
  improveQuestionHandler,
  reviewCodeHandler
} from '../controllers/ai-question.controller';

const router = Router();

// POST /api/v1/ai/generate-question
router.post('/generate-question', generateQuestionHandler);

// POST /api/v1/ai/generate-and-create
router.post('/generate-and-create', authenticate, generateAndCreateHandler);

// POST /api/v1/ai/generate-tests
router.post('/generate-tests', generateTestsHandler);

// POST /api/v1/ai/improve-question
router.post('/improve-question', improveQuestionHandler);

// POST /api/v1/ai/review-code
router.post('/review-code', reviewCodeHandler);

export default router;
