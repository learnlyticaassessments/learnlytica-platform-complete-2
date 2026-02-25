/**
 * Analytics Routes
 */

import { Router } from 'express';
import * as controller from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Dashboard stats
router.get('/dashboard', controller.getDashboard);

// Assessment analytics
router.get('/assessments/:id', controller.getAssessmentAnalytics);

// Student report
router.get('/students/:studentId', controller.getStudentReport);

// Export
router.get('/assessments/:id/export-csv', controller.exportCsv);

export default router;
