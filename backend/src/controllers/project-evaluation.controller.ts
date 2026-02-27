import type { Request, Response, NextFunction } from 'express';
import * as projectEvaluationService from '../services/project-evaluation.service';

function getCtx(req: Request) {
  const user = req.user as any;
  return {
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role
  };
}

function asDb(req: Request) {
  return (req as any).db;
}

function handleError(res: Response, error: any) {
  const message = String(error?.message || 'Request failed');
  const status =
    message.includes('not found') ? 404 :
    message.includes('required') ? 400 :
    message.includes('does not belong') || message.includes('organization') ? 403 :
    400;
  res.status(status).json({ success: false, error: message });
}

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.listTemplates(asDb(req), getCtx(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.createTemplate(asDb(req), getCtx(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function listAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.listAssessments(asDb(req), getCtx(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.createAssessment(asDb(req), getCtx(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function publishAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.publishAssessment(asDb(req), getCtx(req), req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getAssessmentDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.getAssessmentDetail(asDb(req), getCtx(req), req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Project assessment not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.deleteAssessment(asDb(req), getCtx(req), req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.createSubmission(asDb(req), getCtx(req), req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function assignAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.assignAssessment(asDb(req), getCtx(req), req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.getSubmission(asDb(req), getCtx(req), req.params.submissionId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Project submission not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function queueRun(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.queueRun(asDb(req), getCtx(req), req.params.submissionId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function uploadSubmissionZip(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file;
    const data = await projectEvaluationService.uploadSubmissionZip(asDb(req), getCtx(req), req.params.submissionId, file);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function deleteSubmissionZip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.deleteSubmissionZip(asDb(req), getCtx(req), req.params.submissionId);
    res.json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function listLearnerAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.listLearnerAssignments(asDb(req), getCtx(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getLearnerAssignmentDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.getLearnerAssignmentDetail(asDb(req), getCtx(req), req.params.submissionId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Project assignment not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function learnerUploadSubmissionZip(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file;
    const data = await projectEvaluationService.learnerUploadSubmissionZip(asDb(req), getCtx(req), req.params.submissionId, file);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function learnerDeleteSubmissionZip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.learnerDeleteSubmissionZip(asDb(req), getCtx(req), req.params.submissionId);
    res.json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function learnerSubmitAndEvaluate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await projectEvaluationService.learnerSubmitAndEvaluate(asDb(req), getCtx(req), req.params.submissionId);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    handleError(res, error);
  }
}
