import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as controller from '../controllers/project-evaluation.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate);
router.use(requireRole('admin', 'client'));

router.get('/templates', controller.listTemplates);
router.post('/templates', controller.createTemplate);

router.get('/assessments', controller.listAssessments);
router.post('/assessments', controller.createAssessment);
router.patch('/assessments/:id/publish', controller.publishAssessment);
router.get('/assessments/:id', controller.getAssessmentDetail);
router.delete('/assessments/:id', controller.deleteAssessment);
router.post('/assessments/:id/assignments', controller.assignAssessment);
router.post('/assessments/:id/submissions', controller.createSubmission);

router.get('/submissions/:submissionId', controller.getSubmission);
router.post('/submissions/:submissionId/upload-zip', upload.single('file'), controller.uploadSubmissionZip);
router.post('/submissions/:submissionId/runs', controller.queueRun);

export default router;
