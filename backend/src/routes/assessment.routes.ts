/**
 * Assessment Routes
 * Express routes for assessment management
 * @module routes/assessment.routes
 */

import { Router } from 'express';
import * as assessmentController from '../controllers/assessment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  createAssessmentSchema, 
  updateAssessmentSchema,
  assignStudentsSchema,
  addQuestionsSchema,
  assignmentFiltersSchema,
  updateAssignmentSchema
} from '../validators/assessment.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List assessments
router.get('/', assessmentController.listAssessments);

// List student assignments (org scoped)
router.get(
  '/assignments',
  validateRequest(assignmentFiltersSchema, 'query'),
  assessmentController.listStudentAssignments
);

// Get single assessment
router.get('/:id', assessmentController.getAssessment);

// Create assessment
router.post(
  '/',
  validateRequest(createAssessmentSchema, 'body'),
  assessmentController.createAssessment
);

// Update assessment
router.put(
  '/:id',
  validateRequest(updateAssessmentSchema, 'body'),
  assessmentController.updateAssessment
);

// Delete assessment
router.delete('/:id', assessmentController.deleteAssessment);

// Add questions to assessment
router.post(
  '/:id/questions',
  validateRequest(addQuestionsSchema, 'body'),
  assessmentController.addQuestions
);

// Remove question from assessment
router.delete('/:id/questions/:questionId', assessmentController.removeQuestion);

// Assign assessment to students
router.post(
  '/:id/assign',
  validateRequest(assignStudentsSchema, 'body'),
  assessmentController.assignToStudents
);

router.patch(
  '/assignments/:assignmentId',
  validateRequest(updateAssignmentSchema, 'body'),
  assessmentController.updateStudentAssignment
);

router.get('/assignments/:assignmentId/review', assessmentController.getStudentAssignmentReview);
router.get('/assignments/:assignmentId', assessmentController.getStudentAssignmentDetail);

router.delete('/assignments/:assignmentId', assessmentController.revokeStudentAssignment);

// Get assessment statistics
router.get('/:id/stats', assessmentController.getStatistics);

// Clone assessment
router.post('/:id/clone', assessmentController.cloneAssessment);

export default router;
