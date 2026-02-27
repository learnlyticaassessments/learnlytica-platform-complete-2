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

export async function getProjectEvaluationAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const data = await analyticsService.getProjectEvaluationAnalytics(db, organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getProjectTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const days = Number(req.query.days || 14);
    const data = await analyticsService.getProjectEvaluationTrends(db, organizationId, days);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getProjectBatchAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const data = await analyticsService.getProjectBatchAnalytics(db, organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[analytics.projects.by-batch] failed', {
      organizationId: (req.user as any)?.organizationId,
      message: error?.message
    });
    res.json({
      success: true,
      data: [],
      warning: 'Batch-wise project analytics is temporarily unavailable.'
    });
  }
}

export async function getProjectAnalyticsDebug(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const data = await analyticsService.getProjectAnalyticsDebug(db, organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[analytics.projects.debug] failed', {
      organizationId: (req.user as any)?.organizationId,
      message: error?.message
    });
    res.json({
      success: true,
      data: {
        organizationId: (req.user as any)?.organizationId || null,
        totalProjectSubmissions: 0,
        bySubmissionKindAndStatus: [],
        byStatus: [],
        recentSubmissions: []
      },
      warning: 'Project analytics debug data is temporarily unavailable.'
    });
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

export async function getStudentSkillMatrix(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const report = await analyticsService.getStudentSkillMatrix(db, organizationId, req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    if (/Learner not found/i.test(error?.message || '')) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
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

export async function exportOrganizationAttemptsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const csv = await analyticsService.exportOrganizationAttemptsCsv(db, organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="organization-attempts.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportSkillMatrixCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const csv = await analyticsService.exportSkillMatrixCsv(db, organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="skill-matrix.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportProjectSummaryCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const csv = await analyticsService.exportProjectSummaryCsv(db, organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="project-evaluation-summary.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
