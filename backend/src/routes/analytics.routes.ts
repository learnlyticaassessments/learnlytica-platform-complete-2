/**
 * Analytics Routes
 */

import { Router } from 'express';
import * as controller from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'client'));

// Dashboard stats
router.get('/dashboard', controller.getDashboard);
router.get('/projects', controller.getProjectEvaluationAnalytics);
router.get('/projects/trends', controller.getProjectTrends);
router.get('/projects/by-batch', controller.getProjectBatchAnalytics);
router.get('/projects/debug', controller.getProjectAnalyticsDebug);

// Assessment analytics
router.get('/assessments/:id', controller.getAssessmentAnalytics);

// Student report
router.get('/students/:studentId', controller.getStudentReport);
router.get('/students/:studentId/skill-matrix', controller.getStudentSkillMatrix);

// Export
router.get('/assessments/:id/export-csv', controller.exportCsv);
router.get('/exports/org-attempts-csv', controller.exportOrganizationAttemptsCsv);
router.get('/exports/skill-matrix-csv', controller.exportSkillMatrixCsv);
router.get('/exports/project-summary-csv', controller.exportProjectSummaryCsv);

export default router;
