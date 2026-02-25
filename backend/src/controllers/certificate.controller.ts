import { Request, Response, NextFunction } from 'express';
import * as certificateService from '../services/certificate.service';

function getContext(req: Request) {
  const user = req.user as any;
  return {
    userId: user.id,
    organizationId: user.organizationId,
    userRole: user.role
  };
}

export async function listCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const data = await certificateService.listCertificates(db, context.organizationId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const cert = await certificateService.getCertificateById(db, req.params.id);
    if (!cert) {
      res.status(404).json({ success: false, error: 'Certificate not found' });
      return;
    }
    if (cert.organization_id !== context.organizationId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
    res.json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
}

export async function issueCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const cert = await certificateService.issueCertificate(db, req.body.assignmentId, context, req.body);
    res.status(201).json({ success: true, data: cert });
  } catch (error: any) {
    const msg = error?.message || 'Failed to issue certificate';
    if (/(not found)/i.test(msg)) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if (/(Access denied)/i.test(msg)) {
      res.status(403).json({ success: false, error: msg });
      return;
    }
    if (/(already issued|only be issued)/i.test(msg)) {
      res.status(400).json({ success: false, error: msg });
      return;
    }
    next(error);
  }
}

export async function revokeCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const cert = await certificateService.revokeCertificate(db, req.params.id, context, req.body?.reason);
    res.json({ success: true, data: cert });
  } catch (error: any) {
    const msg = error?.message || 'Failed to revoke certificate';
    if (/(not found)/i.test(msg)) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if (/(Access denied)/i.test(msg)) {
      res.status(403).json({ success: false, error: msg });
      return;
    }
    next(error);
  }
}
