import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import * as batchController from '../controllers/batch.controller';
import {
  addBatchMembersSchema,
  assignBatchAssessmentSchema,
  batchIdParamsSchema,
  batchMemberParamsSchema,
  createBatchSchema,
  listBatchMembersQuerySchema,
  listBatchesQuerySchema,
  listBatchResultsQuerySchema,
  updateBatchSchema
} from '../validators/batch.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'client'));

router.get('/', validateRequest(listBatchesQuerySchema, 'query'), batchController.listBatches);
router.post('/', validateRequest(createBatchSchema, 'body'), batchController.createBatch);
router.get('/:id', validateRequest(batchIdParamsSchema, 'params'), batchController.getBatch);
router.patch(
  '/:id',
  validateRequest(batchIdParamsSchema, 'params'),
  validateRequest(updateBatchSchema, 'body'),
  batchController.updateBatch
);

router.get(
  '/:id/members',
  validateRequest(batchIdParamsSchema, 'params'),
  validateRequest(listBatchMembersQuerySchema, 'query'),
  batchController.listBatchMembers
);
router.post(
  '/:id/members',
  validateRequest(batchIdParamsSchema, 'params'),
  validateRequest(addBatchMembersSchema, 'body'),
  batchController.addBatchMembers
);
router.delete(
  '/:id/members/:learnerId',
  validateRequest(batchMemberParamsSchema, 'params'),
  batchController.removeBatchMember
);

router.post(
  '/:id/assignments',
  validateRequest(batchIdParamsSchema, 'params'),
  validateRequest(assignBatchAssessmentSchema, 'body'),
  batchController.assignBatchAssessment
);
router.get(
  '/:id/results',
  validateRequest(batchIdParamsSchema, 'params'),
  validateRequest(listBatchResultsQuerySchema, 'query'),
  batchController.listBatchResults
);

export default router;
