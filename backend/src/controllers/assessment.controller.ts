/**
 * Assessment Controller
 * HTTP request handlers for assessment endpoints
 * @module controllers/assessment.controller
 */

import { Request, Response, NextFunction } from 'express';
import * as assessmentService from '../services/assessment.service';

function getContext(req: Request) {
  const user = req.user as any;
  return {
    userId: user.id,
    organizationId: user.organizationId,
    userRole: user.role
  };
}

export async function createAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    const assessment = await assessmentService.createAssessment(db, req.body, context);
    
    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
}

export async function getAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const include = Array.isArray(req.query.include)
      ? req.query.include.join(',')
      : ((req.query.include as string | undefined) ?? '');
    
    const options = {
      includeQuestions: include.includes('questions'),
      includeLabTemplate: include.includes('labTemplate')
    };
    
    const assessment = await assessmentService.getAssessment(db, req.params.id, options, context);
    
    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
}

export async function listAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    const filters = {
      status: req.query.status as any,
      labTemplateId: req.query.labTemplateId as any,
      createdBy: req.query.createdBy as any,
      search: req.query.search as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const result = await assessmentService.listAssessments(db, filters, context);
    
    res.json({ 
      success: true, 
      data: result.assessments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.page * result.limit < result.total
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    const assessment = await assessmentService.updateAssessment(db, req.params.id, req.body, context);
    
    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    await assessmentService.deleteAssessment(db, req.params.id, context);
    
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function addQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    await assessmentService.addQuestionsToAssessment(db, req.params.id, req.body.questions, context);
    
    res.json({ success: true, message: 'Questions added successfully' });
  } catch (error) {
    next(error);
  }
}

export async function removeQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    await assessmentService.removeQuestionFromAssessment(db, req.params.id, req.params.questionId, context);
    
    res.json({ success: true, message: 'Question removed successfully' });
  } catch (error) {
    next(error);
  }
}

export async function assignToStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    await assessmentService.assignToStudents(db, req.params.id, req.body, context);
    
    res.json({ success: true, message: 'Assessment assigned successfully' });
  } catch (error) {
    next(error);
  }
}

export async function listStudentAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);

    const filters = {
      assessmentId: req.query.assessmentId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await assessmentService.listStudentAssignments(db, filters, context);

    res.json({
      success: true,
      data: result.assignments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.page * result.limit < result.total
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStudentAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);

    const updated = await assessmentService.updateStudentAssignment(db, req.params.assignmentId, req.body, context);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function revokeStudentAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);

    await assessmentService.revokeStudentAssignment(db, req.params.assignmentId, context);

    res.json({ success: true, message: 'Assignment revoked successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAssignmentReview(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);

    const result = await assessmentService.getStudentAssignmentReview(db, req.params.assignmentId, context);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAssignmentDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);

    const result = await assessmentService.getStudentAssignmentDetail(db, req.params.assignmentId, context);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    const stats = await assessmentService.getAssessmentStatistics(db, req.params.id, context);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function cloneAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    
    const cloned = await assessmentService.cloneAssessment(db, req.params.id, req.body.title, context);
    
    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    next(error);
  }
}
