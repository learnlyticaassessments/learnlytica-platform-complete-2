/**
 * Lab Template Routes
 * Express routes for lab template management
 * @module routes/lab-template.routes
 */

import { Router } from 'express';
import * as labTemplateController from '../controllers/lab-template.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createLabTemplateSchema, updateLabTemplateSchema } from '../validators/lab-template.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List lab templates
router.get('/', labTemplateController.listLabTemplates);

// Seed default runtime templates for the current organization
router.post('/seed-defaults', labTemplateController.seedDefaultRuntimeTemplates);

// Get single lab template
router.get('/:id', labTemplateController.getLabTemplate);

// Create lab template (Admin only - enforced in service layer)
router.post(
  '/',
  validateRequest(createLabTemplateSchema, 'body'),
  labTemplateController.createLabTemplate
);

// Update lab template (Admin only - enforced in service layer)
router.put(
  '/:id',
  validateRequest(updateLabTemplateSchema, 'body'),
  labTemplateController.updateLabTemplate
);

// Delete lab template (Admin only - enforced in service layer)
router.delete('/:id', labTemplateController.deleteLabTemplate);

export default router;
