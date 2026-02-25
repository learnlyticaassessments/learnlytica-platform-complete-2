/**
 * Student Assessment Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as studentService from '../services/student-assessment.service';

export async function getMyAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;

    const assessments = await studentService.getMyAssessments(db, studentId);
    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentToTake(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;
    const sessionKey = (req.headers['x-attempt-session-key'] as string | undefined) || undefined;

    const data = await studentService.getAssessmentToTake(db, req.params.id, studentId, sessionKey);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function startAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;
    const sessionKey = (req.headers['x-attempt-session-key'] as string | undefined) || undefined;

    const result = await studentService.startAssessment(db, req.params.id, studentId, sessionKey);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;
    const sessionKey = (req.headers['x-attempt-session-key'] as string | undefined) || undefined;

    const result = await studentService.saveDraft(
      db,
      req.params.id,
      studentId,
      req.body.draftState,
      req.body.focusEvents || [],
      sessionKey
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function submitAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;

    const result = await studentService.submitAssessment(
      db,
      req.params.id,
      studentId,
      req.body.code,
      req.body.timeSpentMinutes,
      (req.headers['x-attempt-session-key'] as string | undefined) || undefined
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function runTests(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user!.id!;
    const results = await studentService.runTests(
      db,
      req.params.id,
      studentId,
      req.body.questionId,
      req.body.code,
      (req.headers['x-attempt-session-key'] as string | undefined) || undefined
    );
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

export async function getSubmittedReview(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const studentId = req.user.id;
    const review = await studentService.getSubmittedReview(db, req.params.id, studentId);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}
