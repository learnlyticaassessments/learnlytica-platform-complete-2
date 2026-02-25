import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as learnerController from '../controllers/learner.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'client'));

router.get('/', learnerController.listLearners);
router.post('/', learnerController.createLearner);

export default router;

