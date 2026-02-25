import { Request, Response, NextFunction } from 'express';
import { sql } from 'kysely';
import * as assessmentModel from '../models/assessment.model';

type ReentryPolicy = 'resume_allowed' | 'single_session';

function getContext(req: Request) {
  const user = req.user as any;
  return {
    userId: user.id,
    organizationId: user.organizationId,
    userRole: user.role
  };
}

async function getBatchOrThrow(db: any, batchId: string, organizationId: string) {
  const batch = await db
    .selectFrom('batches')
    .selectAll()
    .where('id', '=', batchId)
    .executeTakeFirst();

  if (!batch) {
    const err: any = new Error('Batch not found');
    err.statusCode = 404;
    throw err;
  }
  if (batch.organization_id !== organizationId) {
    const err: any = new Error('Access denied to this batch');
    err.statusCode = 403;
    throw err;
  }
  return batch;
}

function mapBatch(row: any, summary?: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    type: row.type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    metadata: row.metadata_json,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    summary: summary || {
      memberCount: 0,
      activeMemberCount: 0,
      assignmentCount: 0,
      submittedCount: 0,
      averageScore: null,
      passRate: 0
    }
  };
}

async function getBatchSummaries(db: any, batchIds: string[]) {
  if (!batchIds.length) return new Map<string, any>();

  const membershipRows = await db
    .selectFrom('batch_memberships')
    .select([
      'batch_id as batchId',
      sql<number>`count(*)`.as('memberCount'),
      sql<number>`count(*) filter (where status = 'active')`.as('activeMemberCount')
    ])
    .where('batch_id', 'in', batchIds)
    .groupBy('batch_id')
    .execute();

  const assignmentRows = await db
    .selectFrom('student_assessments')
    .select([
      'assigned_batch_id as batchId',
      sql<number>`count(*)`.as('assignmentCount'),
      sql<number>`count(*) filter (where status in ('submitted','graded'))`.as('submittedCount'),
      sql<number>`count(*) filter (where passed = true)`.as('passedCount'),
      sql<number>`avg(score) filter (where score is not null)`.as('averageScore')
    ])
    .where('assigned_batch_id', 'in', batchIds)
    .groupBy('assigned_batch_id')
    .execute();

  const map = new Map<string, any>();
  for (const row of membershipRows as any[]) {
    map.set(row.batchId, {
      memberCount: Number(row.memberCount || 0),
      activeMemberCount: Number(row.activeMemberCount || 0),
      assignmentCount: 0,
      submittedCount: 0,
      averageScore: null,
      passRate: 0
    });
  }
  for (const row of assignmentRows as any[]) {
    const existing = map.get(row.batchId) || {
      memberCount: 0,
      activeMemberCount: 0
    };
    const assignmentCount = Number(row.assignmentCount || 0);
    const passedCount = Number(row.passedCount || 0);
    map.set(row.batchId, {
      ...existing,
      assignmentCount,
      submittedCount: Number(row.submittedCount || 0),
      averageScore: row.averageScore == null ? null : Number(row.averageScore),
      passRate: assignmentCount > 0 ? Math.round((passedCount / assignmentCount) * 1000) / 10 : 0
    });
  }
  return map;
}

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const { search, status, type } = req.query as any;
    const page = Number((req.query as any).page || 1);
    const limit = Number((req.query as any).limit || 20);
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom('batches')
      .where('organization_id', '=', organizationId);

    if (status) query = query.where('status', '=', status);
    if (type) query = query.where('type', '=', type);
    if (search) {
      const term = `%${String(search).trim()}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('name', 'ilike', term),
          eb('code', 'ilike', term)
        ])
      );
    }

    const countRow = await query.select(sql`count(*)`.as('count')).executeTakeFirst();
    const rows = await query
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const ids = rows.map((r: any) => r.id);
    const summaries = await getBatchSummaries(db, ids);

    res.json({
      success: true,
      data: rows.map((row: any) => mapBatch(row, summaries.get(row.id))),
      pagination: {
        total: Number((countRow as any)?.count || 0),
        page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId, userId } = getContext(req);
    const body = req.body as any;

    const inserted = await db
      .insertInto('batches')
      .values({
        organization_id: organizationId,
        name: body.name.trim(),
        code: body.code?.trim() || null,
        type: body.type || 'custom',
        status: 'active',
        start_date: body.startDate ? new Date(body.startDate) : null,
        end_date: body.endDate ? new Date(body.endDate) : null,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json({ success: true, data: mapBatch(inserted) });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'Batch name or code already exists in this organization' });
      return;
    }
    next(error);
  }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const batch = await getBatchOrThrow(db, req.params.id, organizationId);
    const summaries = await getBatchSummaries(db, [batch.id]);
    res.json({ success: true, data: mapBatch(batch, summaries.get(batch.id)) });
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    await getBatchOrThrow(db, req.params.id, organizationId);
    const body = req.body as any;
    const values: any = {};

    if (body.name !== undefined) values.name = body.name.trim();
    if (body.code !== undefined) values.code = body.code ? String(body.code).trim() : null;
    if (body.type !== undefined) values.type = body.type;
    if (body.status !== undefined) values.status = body.status;
    if (body.startDate !== undefined) values.start_date = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) values.end_date = body.endDate ? new Date(body.endDate) : null;

    const updated = await db
      .updateTable('batches')
      .set(values)
      .where('id', '=', req.params.id)
      .where('organization_id', '=', organizationId)
      .returningAll()
      .executeTakeFirst();

    const summaries = await getBatchSummaries(db, [req.params.id]);
    res.json({ success: true, data: mapBatch(updated, summaries.get(req.params.id)) });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'Batch name or code already exists in this organization' });
      return;
    }
    next(error);
  }
}

export async function listBatchMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    await getBatchOrThrow(db, req.params.id, organizationId);
    const { search, status } = req.query as any;
    const page = Number((req.query as any).page || 1);
    const limit = Number((req.query as any).limit || 50);
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom('batch_memberships as bm')
      .innerJoin('users as u', 'u.id', 'bm.student_id')
      .where('bm.batch_id', '=', req.params.id)
      .where('u.organization_id', '=', organizationId)
      .where('u.role', '=', 'student');

    if (status) query = query.where('bm.status', '=', status);
    if (search) {
      const term = `%${String(search).trim()}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('u.full_name', 'ilike', term),
          eb('u.email', 'ilike', term)
        ])
      );
    }

    const countRow = await query.select(sql`count(*)`.as('count')).executeTakeFirst();
    const rows = await query
      .select([
        'bm.id as membershipId',
        'bm.batch_id as batchId',
        'bm.student_id as learnerId',
        'bm.status as membershipStatus',
        'bm.joined_at as joinedAt',
        'bm.left_at as leftAt',
        'u.full_name as fullName',
        'u.email',
        'u.is_active as isActive'
      ])
      .orderBy('bm.joined_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: Number((countRow as any)?.count || 0),
        page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function addBatchMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const batch = await getBatchOrThrow(db, req.params.id, organizationId);
    const { learnerIds, status = 'active' } = req.body as any;

    if (batch.status !== 'active') {
      res.status(400).json({ success: false, error: 'Cannot add members to an archived batch' });
      return;
    }

    const learnerRows = await db
      .selectFrom('users')
      .select(['id'])
      .where('organization_id', '=', organizationId)
      .where('role', '=', 'student')
      .where('id', 'in', learnerIds)
      .execute();

    const validIds = new Set(learnerRows.map((r: any) => r.id));
    const created: any[] = [];
    const skipped: any[] = [];

    for (const learnerId of learnerIds) {
      if (!validIds.has(learnerId)) {
        skipped.push({ learnerId, reason: 'Learner not found in your organization' });
        continue;
      }
      try {
        const row = await db
          .insertInto('batch_memberships')
          .values({
            batch_id: req.params.id,
            student_id: learnerId,
            status,
            joined_at: new Date(),
            left_at: status === 'inactive' ? new Date() : null
          })
          .returning(['id', 'student_id as learnerId', 'status', 'joined_at as joinedAt'])
          .executeTakeFirstOrThrow();
        created.push(row);
      } catch (error: any) {
        if (error?.code === '23505') {
          skipped.push({ learnerId, reason: 'Learner already in batch' });
          continue;
        }
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created,
        skipped,
        summary: {
          requested: learnerIds.length,
          added: created.length,
          skipped: skipped.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function removeBatchMember(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    await getBatchOrThrow(db, req.params.id, organizationId);

    const membership = await db
      .selectFrom('batch_memberships as bm')
      .innerJoin('users as u', 'u.id', 'bm.student_id')
      .select(['bm.id'])
      .where('bm.batch_id', '=', req.params.id)
      .where('bm.student_id', '=', req.params.learnerId)
      .where('u.organization_id', '=', organizationId)
      .executeTakeFirst();

    if (!membership) {
      res.status(404).json({ success: false, error: 'Batch membership not found' });
      return;
    }

    await db
      .deleteFrom('batch_memberships')
      .where('batch_id', '=', req.params.id)
      .where('student_id', '=', req.params.learnerId)
      .executeTakeFirst();

    res.json({ success: true, message: 'Learner removed from batch' });
  } catch (error) {
    next(error);
  }
}

export async function assignBatchAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const context = getContext(req);
    const batch = await getBatchOrThrow(db, req.params.id, context.organizationId);
    const { assessmentId, dueDate, reentryPolicy } = req.body as {
      assessmentId: string;
      dueDate?: string;
      reentryPolicy: ReentryPolicy;
    };

    if (batch.status !== 'active') {
      res.status(400).json({ success: false, error: 'Cannot assign assessments to an archived batch' });
      return;
    }

    const assessment = await assessmentModel.getAssessmentById(db, assessmentId);
    if (!assessment) {
      res.status(404).json({ success: false, error: 'Assessment not found' });
      return;
    }
    if (assessment.organizationId !== context.organizationId) {
      res.status(403).json({ success: false, error: 'Access denied to this assessment' });
      return;
    }
    if (assessment.status !== 'published') {
      res.status(400).json({ success: false, error: 'Only published assessments can be assigned' });
      return;
    }

    const members = await db
      .selectFrom('batch_memberships as bm')
      .innerJoin('users as u', 'u.id', 'bm.student_id')
      .select(['bm.student_id as learnerId'])
      .where('bm.batch_id', '=', req.params.id)
      .where('bm.status', '=', 'active')
      .where('u.organization_id', '=', context.organizationId)
      .where('u.role', '=', 'student')
      .where('u.is_active', '=', true)
      .execute();

    const learnerIds = members.map((m: any) => m.learnerId);
    if (!learnerIds.length) {
      res.status(400).json({ success: false, error: 'Batch has no active learners to assign' });
      return;
    }

    await assessmentModel.assignToStudents(
      db,
      assessmentId,
      learnerIds,
      context.userId,
      dueDate ? new Date(dueDate) : undefined,
      reentryPolicy || 'resume_allowed',
      req.params.id
    );

    res.json({
      success: true,
      data: {
        batchId: req.params.id,
        assessmentId,
        assignedCount: learnerIds.length,
        reentryPolicy: reentryPolicy || 'resume_allowed'
      }
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'Some learners already have an active attempt for this assessment' });
      return;
    }
    next(error);
  }
}

export async function listBatchResults(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    await getBatchOrThrow(db, req.params.id, organizationId);
    const { assessmentId, status, search } = req.query as any;
    const page = Number((req.query as any).page || 1);
    const limit = Number((req.query as any).limit || 20);
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom('student_assessments as sa')
      .innerJoin('assessments as a', 'a.id', 'sa.assessment_id')
      .innerJoin('users as u', 'u.id', 'sa.student_id')
      .where('sa.assigned_batch_id', '=', req.params.id)
      .where('a.organization_id', '=', organizationId);

    if (assessmentId) query = query.where('sa.assessment_id', '=', assessmentId);
    if (status) query = query.where('sa.status', '=', status);
    if (search) {
      const term = `%${String(search).trim()}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('u.full_name', 'ilike', term),
          eb('u.email', 'ilike', term),
          eb('a.title', 'ilike', term)
        ])
      );
    }

    const countRow = await query.select(sql`count(*)`.as('count')).executeTakeFirst();
    const summaryRow = await query
      .select([
        sql<number>`count(*)`.as('assignmentCount'),
        sql<number>`count(*) filter (where sa.status in ('submitted','graded'))`.as('submittedCount'),
        sql<number>`count(*) filter (where sa.status = 'in_progress')`.as('inProgressCount'),
        sql<number>`count(*) filter (where sa.status = 'assigned')`.as('notStartedCount'),
        sql<number>`count(*) filter (where sa.passed = true)`.as('passedCount'),
        sql<number>`avg(sa.score) filter (where sa.score is not null)`.as('averageScore')
      ])
      .executeTakeFirst();

    const rows = await query
      .select([
        'sa.id',
        'sa.assessment_id as assessmentId',
        'a.title as assessmentTitle',
        'sa.student_id as learnerId',
        'u.full_name as learnerName',
        'u.email as learnerEmail',
        'sa.status',
        'sa.assigned_at as assignedAt',
        'sa.due_date as dueDate',
        'sa.started_at as startedAt',
        'sa.submitted_at as submittedAt',
        'sa.score',
        'sa.points_earned as pointsEarned',
        'sa.total_points as totalPoints',
        'sa.passed',
        'sa.reentry_policy as reentryPolicy',
        'sa.last_activity_at as lastActivityAt'
      ])
      .orderBy('sa.assigned_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const assignmentCount = Number((summaryRow as any)?.assignmentCount || 0);
    const passedCount = Number((summaryRow as any)?.passedCount || 0);

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        ...r,
        score: r.score == null ? null : Number(r.score),
        pointsEarned: r.pointsEarned == null ? null : Number(r.pointsEarned),
        totalPoints: r.totalPoints == null ? null : Number(r.totalPoints)
      })),
      summary: {
        assignmentCount,
        submittedCount: Number((summaryRow as any)?.submittedCount || 0),
        inProgressCount: Number((summaryRow as any)?.inProgressCount || 0),
        notStartedCount: Number((summaryRow as any)?.notStartedCount || 0),
        averageScore: (summaryRow as any)?.averageScore == null ? null : Number((summaryRow as any).averageScore),
        passRate: assignmentCount > 0 ? Math.round((passedCount / assignmentCount) * 1000) / 10 : 0
      },
      pagination: {
        total: Number((countRow as any)?.count || 0),
        page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
}
