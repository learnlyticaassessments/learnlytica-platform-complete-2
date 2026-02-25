import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as controller from '../controllers/certificate.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'client'));

router.get('/', controller.listCertificates);
router.get('/:id', controller.getCertificate);
router.post('/issue', controller.issueCertificate);
router.post('/:id/revoke', controller.revokeCertificate);

export default router;
