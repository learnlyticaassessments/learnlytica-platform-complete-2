import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as controller from '../controllers/project-evaluation.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'client'));

router.get('/templates', controller.listTemplates);
router.post('/templates', controller.createTemplate);

router.get('/assessments', controller.listAssessments);
router.post('/assessments', controller.createAssessment);
router.get('/assessments/:id', controller.getAssessmentDetail);
router.post('/assessments/:id/submissions', controller.createSubmission);

router.get('/submissions/:submissionId', controller.getSubmission);
router.post('/submissions/:submissionId/runs', controller.queueRun);

export default router;
