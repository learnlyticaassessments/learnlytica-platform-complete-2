import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginHandler);
router.get('/me', authenticate, meHandler);

export default router;

