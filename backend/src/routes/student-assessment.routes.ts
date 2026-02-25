/**
 * Student Assessment Routes
 */

import { Router } from 'express';
import * as controller from '../controllers/student-assessment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get my assigned assessments
router.get('/assessments', controller.getMyAssessments);

// Get assessment to take
router.get('/assessments/:id', controller.getAssessmentToTake);

// Start assessment
router.post('/assessments/:id/start', controller.startAssessment);

// Submit assessment
router.post('/assessments/:id/submit', controller.submitAssessment);

// Run tests
router.post('/assessments/:id/run-tests', controller.runTests);

export default router;
