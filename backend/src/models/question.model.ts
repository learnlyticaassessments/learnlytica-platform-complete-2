/**
 * Question Database Model using Kysely
 * Type-safe database queries for questions table
 * @module models/question.model
 */

import { sql } from 'kysely';
import type {
  Question,
  QuestionFilters,
  CreateQuestionDTO,
  UpdateQuestionDTO
} from '../../shared/types/question.types';

// This file contains type-safe database queries using Kysely
// Import db from your database configuration file

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to Question type
 */
export function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    problemStyle: row.problem_style || undefined,
    technicalFocus: row.technical_focus || undefined,
    subcategory: row.subcategory || [],
    difficulty: row.difficulty,
    skills: row.skills || [],
    tags: row.tags || [],
    starterCode: row.starter_code,
    testFramework: row.test_framework,
    testConfig: row.test_config,
    solution: row.solution || undefined,
    timeEstimate: row.time_estimate,
    points: row.points,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by || undefined,
    status: row.status,
    version: row.version,
    parentQuestionId: row.parent_question_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
    archivedAt: row.archived_at || undefined
  };
}

// ===========================================================================
// CREATE
// ============================================================================

export async function createQuestion(
  db: any,
  data: CreateQuestionDTO & { organizationId: string; createdBy: string; slug: string }
): Promise<Question> {
  const result = await db
    .insertInto('questions')
    .values({
      organization_id: data.organizationId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      problem_style: data.problemStyle || 'implementation',
      technical_focus: data.technicalFocus || null,
      subcategory: data.subcategory || [],
      difficulty: data.difficulty,
      skills: data.skills || [],
      tags: data.tags || [],
      starter_code: JSON.stringify(data.starterCode),
      test_framework: data.testFramework,
      test_config: JSON.stringify(data.testConfig),
      solution: data.solution ? JSON.stringify(data.solution) : null,
      time_estimate: data.timeEstimate,
      points: data.points || 100,
      created_by: data.createdBy,
      status: 'draft'
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return rowToQuestion(result);
}

// ============================================================================
// READ
// ============================================================================

export async function getQuestionById(db: any, id: string): Promise<Question | null> {
  const result = await db
    .selectFrom('questions')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  return result ? rowToQuestion(result) : null;
}

export async function listQuestions(
  db: any,
  organizationId: string,
  filters: QuestionFilters
) {
  let query = db
    .selectFrom('questions')
    .where('organization_id', '=', organizationId);

  // Apply filters
  if (filters.category) query = query.where('category', '=', filters.category);
  if (filters.problemStyle) query = query.where('problem_style', '=', filters.problemStyle);
  if (filters.technicalFocus) query = query.where('technical_focus', 'ilike', `%${filters.technicalFocus}%`);
  if (filters.difficulty) query = query.where('difficulty', '=', filters.difficulty);
  if (filters.status) query = query.where('status', '=', filters.status);
  if (filters.createdBy) query = query.where('created_by', '=', filters.createdBy);
  if (filters.curriculum) {
    const slug = String(filters.curriculum).trim().toLowerCase();
    query = query.where((eb: any) =>
      eb.exists(
        db
          .selectFrom('question_curricula as qc')
          .innerJoin('curricula as c', 'c.id', 'qc.curriculum_id')
          .select('qc.question_id')
          .whereRef('qc.question_id', '=', 'questions.id')
          .where('qc.organization_id', '=', organizationId)
          .where('c.organization_id', '=', organizationId)
          .where('c.slug', '=', slug)
      )
    );
  }

  // Full-text search
  if (filters.search) {
    query = query.where(sql`
      to_tsvector('english', title || ' ' || description) @@ 
      plainto_tsquery('english', ${filters.search})
    `);
  }

  // Get total count
  const countResult = await query.select(sql`count(*)`.as('count')).executeTakeFirst();
  const total = Number(countResult?.count || 0);

  // Apply sorting and pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  query = query.orderBy('created_at', 'desc');

  const results = await query.selectAll().limit(limit).offset(offset).execute();

  return {
    questions: results.map(rowToQuestion),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page < Math.ceil(total / limit)
  };
}

export async function listCurricula(db: any, organizationId: string) {
  const rows = await db
    .selectFrom('curricula')
    .select(['id', 'slug', 'name', 'description', 'is_active as isActive', 'updated_at as updatedAt'])
    .where('organization_id', '=', organizationId)
    .where('is_active', '=', true)
    .orderBy('name', 'asc')
    .execute();

  return rows;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateQuestion(
  db: any,
  id: string,
  data: UpdateQuestionDTO
): Promise<Question | null> {
  const updateData: any = {};

  if (data.title) updateData.title = data.title;
  if (data.description) updateData.description = data.description;
  if (data.category) updateData.category = data.category;
  if (data.problemStyle) updateData.problem_style = data.problemStyle;
  if (typeof data.technicalFocus === 'string' && data.technicalFocus.trim()) {
    updateData.technical_focus = data.technicalFocus.trim();
  }
  if (data.difficulty) updateData.difficulty = data.difficulty;
  if (data.starterCode) updateData.starter_code = JSON.stringify(data.starterCode);
  if (data.testConfig) updateData.test_config = JSON.stringify(data.testConfig);
  if (data.solution) updateData.solution = JSON.stringify(data.solution);
  if (data.timeEstimate) updateData.time_estimate = data.timeEstimate;
  if (data.points) updateData.points = data.points;
  if (data.status) {
    updateData.status = data.status;
    if (data.status === 'published') updateData.published_at = new Date();
    if (data.status === 'archived') updateData.archived_at = new Date();
  }

  const result = await db
    .updateTable('questions')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return result ? rowToQuestion(result) : null;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteQuestion(db: any, id: string): Promise<boolean> {
  const result = await db
    .updateTable('questions')
    .set({ status: 'archived', archived_at: new Date() })
    .where('id', '=', id)
    .executeTakeFirst();

  return result.numUpdatedRows > 0;
}
