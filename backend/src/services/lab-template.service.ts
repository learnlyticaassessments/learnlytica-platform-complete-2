/**
 * Lab Template Service
 * Business logic for lab template management
 * @module services/lab-template.service
 */

import * as labTemplateModel from '../models/lab-template.model';

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class LabTemplateNotFoundError extends Error {
  constructor(id: string) {
    super(`Lab template not found: ${id}`);
    this.name = 'LabTemplateNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class LabTemplateInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LabTemplateInUseError';
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createLabTemplate(db: any, data: any, context: any) {
  // Only admins can create lab templates
  if (context.userRole !== 'admin') {
    throw new UnauthorizedError('Only administrators can create lab templates');
  }

  const labTemplate = await labTemplateModel.createLabTemplate(db, {
    ...data,
    organizationId: context.organizationId,
    createdBy: context.userId
  });

  return labTemplate;
}

// ============================================================================
// READ
// ============================================================================

export async function getLabTemplate(db: any, id: string, context: any) {
  const labTemplate = await labTemplateModel.getLabTemplateById(db, id);

  if (!labTemplate) {
    throw new LabTemplateNotFoundError(id);
  }

  // Verify access (must be from same organization)
  if (labTemplate.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this lab template');
  }

  return labTemplate;
}

export async function listLabTemplates(db: any, filters: any, context: any) {
  const labTemplates = await labTemplateModel.listLabTemplates(
    db,
    context.organizationId,
    filters
  );

  return labTemplates;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateLabTemplate(db: any, id: string, data: any, context: any) {
  // Only admins can update lab templates
  if (context.userRole !== 'admin') {
    throw new UnauthorizedError('Only administrators can update lab templates');
  }

  // Verify template exists and belongs to organization
  const existing = await labTemplateModel.getLabTemplateById(db, id);
  if (!existing) {
    throw new LabTemplateNotFoundError(id);
  }

  if (existing.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this lab template');
  }

  const updated = await labTemplateModel.updateLabTemplate(db, id, data);
  return updated;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteLabTemplate(db: any, id: string, context: any) {
  // Only admins can delete lab templates
  if (context.userRole !== 'admin') {
    throw new UnauthorizedError('Only administrators can delete lab templates');
  }

  // Verify template exists
  const existing = await labTemplateModel.getLabTemplateById(db, id);
  if (!existing) {
    throw new LabTemplateNotFoundError(id);
  }

  if (existing.organizationId !== context.organizationId) {
    throw new UnauthorizedError('Access denied to this lab template');
  }

  // Check if template is in use
  if (existing.usageCount > 0) {
    throw new LabTemplateInUseError(
      `Cannot delete lab template. It is used by ${existing.usageCount} assessment(s)`
    );
  }

  const deleted = await labTemplateModel.deleteLabTemplate(db, id);
  return deleted;
}
