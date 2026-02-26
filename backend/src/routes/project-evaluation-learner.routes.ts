import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as controller from '../controllers/project-evaluation.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate);
router.use(requireRole('student'));

router.get('/assignments', controller.listLearnerAssignments);
router.get('/assignments/:submissionId', controller.getLearnerAssignmentDetail);
router.post('/assignments/:submissionId/upload-zip', upload.single('file'), controller.learnerUploadSubmissionZip);
router.post('/assignments/:submissionId/submit', controller.learnerSubmitAndEvaluate);

export default router;
