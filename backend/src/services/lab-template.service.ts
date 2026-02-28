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

function getDefaultRuntimeTemplates() {
  return [
    {
      name: 'Node Runtime (Jest/Supertest)',
      description: 'Node.js runtime for JavaScript and API tests',
      category: 'backend',
      dockerImage: 'learnlytica/executor-node:latest',
      resourceLimits: { cpu: '1', memory: '1Gi', storage: '5Gi' }
    },
    {
      name: 'Python Runtime (Pytest)',
      description: 'Python runtime for pytest and API request tests',
      category: 'backend',
      dockerImage: 'learnlytica/executor-python:latest',
      resourceLimits: { cpu: '1', memory: '1Gi', storage: '5Gi' }
    },
    {
      name: 'Java Runtime (JUnit)',
      description: 'Java runtime for JUnit-based assessments',
      category: 'backend',
      dockerImage: 'learnlytica/executor-java:latest',
      resourceLimits: { cpu: '1', memory: '2Gi', storage: '5Gi' }
    },
    {
      name: 'Playwright Runtime (Browser)',
      description: 'Browser-capable runtime for Playwright UI evaluation',
      category: 'frontend',
      dockerImage: 'learnlytica/executor-playwright:latest',
      resourceLimits: { cpu: '1', memory: '2Gi', storage: '6Gi' }
    },
    {
      name: '.NET Runtime (xUnit)',
      description: '.NET runtime for C# xUnit assessments',
      category: 'backend',
      dockerImage: 'learnlytica/executor-dotnet:latest',
      resourceLimits: { cpu: '1', memory: '2Gi', storage: '6Gi' }
    }
  ];
}

async function ensureDefaultRuntimeTemplates(db: any, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    return { createdCount: 0, created: [], totalDefaults: getDefaultRuntimeTemplates().length };
  }

  const defaults = getDefaultRuntimeTemplates();
  const existing = await labTemplateModel.listLabTemplates(db, context.organizationId, {});
  const existingKeys = new Set(
    existing.map((t: any) => `${String(t.name || '').toLowerCase()}|${String(t.dockerImage || '').toLowerCase()}`)
  );

  const created: any[] = [];
  for (const tpl of defaults) {
    const key = `${tpl.name.toLowerCase()}|${tpl.dockerImage.toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    const item = await labTemplateModel.createLabTemplate(db, {
      ...tpl,
      organizationId: context.organizationId,
      createdBy: context.userId,
      dockerTag: 'latest',
      vscodeExtensions: [],
      vscodeSettings: {},
      environmentVariables: {},
      npmPackages: [],
      pipPackages: [],
      exposedPorts: []
    });
    created.push(item);
  }

  return {
    createdCount: created.length,
    created,
    totalDefaults: defaults.length
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createLabTemplate(db: any, data: any, context: any) {
  // Admins and client-org admins can create lab templates
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Only administrators or client admins can create lab templates');
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
  let labTemplates = await labTemplateModel.listLabTemplates(
    db,
    context.organizationId,
    filters
  );

  // Production-safe fallback: ensure executor-backed default runtime templates
  // are available per org so assessment runtime dropdown is never empty.
  if (!labTemplates.length) {
    await ensureDefaultRuntimeTemplates(db, context);
    labTemplates = await labTemplateModel.listLabTemplates(
      db,
      context.organizationId,
      filters
    );
  }

  return labTemplates;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateLabTemplate(db: any, id: string, data: any, context: any) {
  // Admins and client-org admins can update lab templates
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Only administrators or client admins can update lab templates');
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
  // Admins and client-org admins can delete lab templates
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Only administrators or client admins can delete lab templates');
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

export async function seedDefaultRuntimeTemplates(db: any, context: any) {
  if (!['admin', 'client'].includes(context.userRole)) {
    throw new UnauthorizedError('Only administrators or client admins can seed runtime templates');
  }
  return ensureDefaultRuntimeTemplates(db, context);
}
