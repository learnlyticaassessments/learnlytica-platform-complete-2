/**
 * Lab Template Database Model
 * Type-safe database queries for lab templates
 * @module models/lab-template.model
 */

import { sql } from 'kysely';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function rowToLabTemplate(row: any): any {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    category: row.category,
    dockerImage: row.docker_image,
    dockerTag: row.docker_tag,
    dockerfileContent: row.dockerfile_content,
    vscodeExtensions: row.vscode_extensions || [],
    vscodeSettings: row.vscode_settings || {},
    resourceLimits: row.resource_limits,
    environmentVariables: row.environment_variables || {},
    npmPackages: row.npm_packages || [],
    pipPackages: row.pip_packages || [],
    exposedPorts: row.exposed_ports || [],
    isActive: row.is_active,
    usageCount: row.usage_count,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createLabTemplate(db: any, data: any): Promise<any> {
  const result = await db
    .insertInto('lab_templates')
    .values({
      organization_id: data.organizationId,
      name: data.name,
      description: data.description,
      category: data.category,
      docker_image: data.dockerImage,
      docker_tag: data.dockerTag || 'latest',
      dockerfile_content: data.dockerfileContent,
      vscode_extensions: JSON.stringify(data.vscodeExtensions || []),
      vscode_settings: JSON.stringify(data.vscodeSettings || {}),
      resource_limits: JSON.stringify(data.resourceLimits),
      environment_variables: JSON.stringify(data.environmentVariables || {}),
      npm_packages: data.npmPackages || [],
      pip_packages: data.pipPackages || [],
      exposed_ports: data.exposedPorts || [],
      is_active: true,
      created_by: data.createdBy
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return rowToLabTemplate(result);
}

// ============================================================================
// READ
// ============================================================================

export async function getLabTemplateById(db: any, id: string): Promise<any> {
  const result = await db
    .selectFrom('lab_templates')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  return result ? rowToLabTemplate(result) : null;
}

export async function listLabTemplates(
  db: any,
  organizationId: string,
  filters?: any
): Promise<any[]> {
  let query = db
    .selectFrom('lab_templates')
    .where('organization_id', '=', organizationId);

  if (filters?.category) {
    query = query.where('category', '=', filters.category);
  }

  if (filters?.isActive !== undefined) {
    query = query.where('is_active', '=', filters.isActive);
  }

  query = query.orderBy('created_at', 'desc');

  const results = await query.selectAll().execute();
  return results.map(rowToLabTemplate);
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateLabTemplate(
  db: any,
  id: string,
  data: any
): Promise<any> {
  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category) updateData.category = data.category;
  if (data.dockerImage) updateData.docker_image = data.dockerImage;
  if (data.dockerTag) updateData.docker_tag = data.dockerTag;
  if (data.dockerfileContent !== undefined) updateData.dockerfile_content = data.dockerfileContent;
  if (data.vscodeExtensions) updateData.vscode_extensions = JSON.stringify(data.vscodeExtensions);
  if (data.vscodeSettings) updateData.vscode_settings = JSON.stringify(data.vscodeSettings);
  if (data.resourceLimits) updateData.resource_limits = JSON.stringify(data.resourceLimits);
  if (data.environmentVariables) updateData.environment_variables = JSON.stringify(data.environmentVariables);
  if (data.npmPackages) updateData.npm_packages = data.npmPackages;
  if (data.pipPackages) updateData.pip_packages = data.pipPackages;
  if (data.exposedPorts) updateData.exposed_ports = data.exposedPorts;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  const result = await db
    .updateTable('lab_templates')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return result ? rowToLabTemplate(result) : null;
}

export async function incrementUsageCount(db: any, id: string): Promise<void> {
  await db
    .updateTable('lab_templates')
    .set({ usage_count: sql`usage_count + 1` })
    .where('id', '=', id)
    .execute();
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteLabTemplate(db: any, id: string): Promise<boolean> {
  const result = await db
    .deleteFrom('lab_templates')
    .where('id', '=', id)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
}
