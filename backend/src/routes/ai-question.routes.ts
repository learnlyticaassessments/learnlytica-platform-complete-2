/**
 * AI Question Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAICapabilitiesHandler,
  generateQuestionHandler,
  generateAndCreateHandler,
  generateTestsHandler,
  improveQuestionHandler,
  reviewCodeHandler
} from '../controllers/ai-question.controller';

const router = Router();

// GET /api/v1/ai/capabilities
router.get('/capabilities', authenticate, getAICapabilitiesHandler);

// POST /api/v1/ai/generate-question
router.post('/generate-question', authenticate, generateQuestionHandler);

// POST /api/v1/ai/generate-and-create
router.post('/generate-and-create', authenticate, generateAndCreateHandler);

// POST /api/v1/ai/generate-tests
router.post('/generate-tests', authenticate, generateTestsHandler);

// POST /api/v1/ai/improve-question
router.post('/improve-question', authenticate, improveQuestionHandler);

// POST /api/v1/ai/review-code
router.post('/review-code', authenticate, reviewCodeHandler);

export default router;
