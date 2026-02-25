/**
 * Lab Template Controller
 * HTTP request handlers for lab template endpoints
 * @module controllers/lab-template.controller
 */

import { Request, Response, NextFunction } from 'express';
import * as labTemplateService from '../services/lab-template.service';

export async function createLabTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const user = req.user as any;
    const context = { userId: user.id, organizationId: user.organizationId, userRole: user.role };
    
    const labTemplate = await labTemplateService.createLabTemplate(db, req.body, context);
    
    res.status(201).json({ success: true, data: labTemplate });
  } catch (error) {
    next(error);
  }
}

export async function getLabTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const user = req.user as any;
    const context = { userId: user.id, organizationId: user.organizationId, userRole: user.role };
    
    const labTemplate = await labTemplateService.getLabTemplate(db, req.params.id, context);
    
    res.json({ success: true, data: labTemplate });
  } catch (error) {
    next(error);
  }
}

export async function listLabTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const user = req.user as any;
    const context = { userId: user.id, organizationId: user.organizationId, userRole: user.role };
    
    const filters = {
      category: req.query.category,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
    };
    
    const labTemplates = await labTemplateService.listLabTemplates(db, filters, context);
    
    res.json({ success: true, data: labTemplates });
  } catch (error) {
    next(error);
  }
}

export async function updateLabTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const user = req.user as any;
    const context = { userId: user.id, organizationId: user.organizationId, userRole: user.role };
    
    const labTemplate = await labTemplateService.updateLabTemplate(db, req.params.id, req.body, context);
    
    res.json({ success: true, data: labTemplate });
  } catch (error) {
    next(error);
  }
}

export async function deleteLabTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const user = req.user as any;
    const context = { userId: user.id, organizationId: user.organizationId, userRole: user.role };
    
    await labTemplateService.deleteLabTemplate(db, req.params.id, context);
    
    res.json({ success: true, message: 'Lab template deleted successfully' });
  } catch (error) {
    next(error);
  }
}
