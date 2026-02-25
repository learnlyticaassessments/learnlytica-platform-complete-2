/**
 * Question Library Routes
 */

import { Router } from 'express';
import {
  getTemplatesHandler,
  getSamplesHandler,
  getGuidelinesHandler,
  importQuestionHandler,
  exportQuestionHandler,
  getLibraryStatsHandler
} from '../controllers/question-library.controller';

const router = Router();

// GET /api/v1/library/templates?language=javascript
router.get('/templates', getTemplatesHandler);

// GET /api/v1/library/samples?difficulty=beginner
router.get('/samples', getSamplesHandler);

// GET /api/v1/library/guidelines
router.get('/guidelines', getGuidelinesHandler);

// GET /api/v1/library/stats
router.get('/stats', getLibraryStatsHandler);

// POST /api/v1/library/import
router.post('/import', importQuestionHandler);

// POST /api/v1/library/export
router.post('/export', exportQuestionHandler);

export default router;
