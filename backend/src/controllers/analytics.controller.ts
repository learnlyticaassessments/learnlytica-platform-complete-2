/**
 * Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;

    const stats = await analyticsService.getDashboardStats(db, organizationId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const analytics = await analyticsService.getAssessmentAnalytics(db, req.params.id);
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
}

export async function getStudentReport(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const report = await analyticsService.getStudentReport(db, req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const csv = await analyticsService.exportToCsv(db, req.params.id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assessment-${req.params.id}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
