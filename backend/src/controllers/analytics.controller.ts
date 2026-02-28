/**
 * Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export async function getSystemMonitor(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const organizationId = (req.user as any).organizationId as string;
    const data = await analyticsService.getSystemMonitorStats(db, organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getExecutorHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const expectedImages = [
      'learnlytica/executor-node:latest',
      'learnlytica/executor-python:latest',
      'learnlytica/executor-java:latest',
      'learnlytica/executor-playwright:latest',
      'learnlytica/executor-dotnet:latest'
    ];

    let dockerDaemonReachable = true;
    let daemonError: string | null = null;
    try {
      await execAsync('docker info', { timeout: 10000, maxBuffer: 1024 * 1024 });
    } catch (error: any) {
      dockerDaemonReachable = false;
      daemonError = String(error?.stderr || error?.message || 'docker info failed').trim();
    }

    const checks = await Promise.all(
      expectedImages.map(async (image) => {
        try {
          await execAsync(`docker image inspect ${image}`, { timeout: 10000, maxBuffer: 1024 * 1024 });
          return { image, available: true };
        } catch {
          return { image, available: false };
        }
      })
    );

    const availableCount = checks.filter((c) => c.available).length;
    const missingImages = checks.filter((c) => !c.available).map((c) => c.image);
    const healthy = dockerDaemonReachable && missingImages.length === 0;

    res.json({
      success: true,
      data: {
        healthy,
        dockerDaemonReachable,
        daemonError,
        availableCount,
        totalExpected: expectedImages.length,
        checks,
        missingImages,
        recommendedBuildCommand:
          'cd docker/execution-environments && docker build -t learnlytica/executor-node:latest -f Dockerfile.node . && docker build -t learnlytica/executor-python:latest -f Dockerfile.python . && docker build -t learnlytica/executor-java:latest -f Dockerfile.java . && docker build -t learnlytica/executor-playwright:latest -f Dockerfile.playwright . && docker build -t learnlytica/executor-dotnet:latest -f Dockerfile.dotnet .'
      }
    });
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
