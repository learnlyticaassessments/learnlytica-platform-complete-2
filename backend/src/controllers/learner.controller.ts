import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

function getContext(req: Request) {
  const user = req.user as any;
  return {
    userId: user.id,
    organizationId: user.organizationId,
    userRole: user.role
  };
}

export async function listLearners(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);

    const rows = await db
      .selectFrom('users')
      .select([
        'id',
        'email',
        'full_name as fullName',
        'is_active as isActive',
        'created_at as createdAt'
      ])
      .where('organization_id', '=', organizationId)
      .where('role', '=', 'student')
      .orderBy('created_at', 'desc')
      .execute();

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createLearner(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const { email, fullName, password } = req.body || {};

    if (!email || !fullName || !password) {
      res.status(400).json({ success: false, error: 'email, fullName and password are required' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(password), 10);

    const row = await db
      .insertInto('users')
      .values({
        organization_id: organizationId,
        email: normalizedEmail,
        full_name: String(fullName).trim(),
        password_hash: passwordHash,
        role: 'student',
        is_active: true
      })
      .returning([
        'id',
        'email',
        'full_name as fullName',
        'is_active as isActive',
        'created_at as createdAt'
      ])
      .executeTakeFirst();

    res.status(201).json({ success: true, data: row });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'Learner email already exists' });
      return;
    }
    next(error);
  }
}

export async function importLearners(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const defaultPassword = req.body?.defaultPassword ? String(req.body.defaultPassword) : null;

    if (!rows.length) {
      res.status(400).json({ success: false, error: 'rows is required' });
      return;
    }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const [index, row] of rows.entries()) {
      const email = String(row?.email || '').trim().toLowerCase();
      const fullName = String(row?.fullName || '').trim();
      const password = String(row?.password || defaultPassword || '').trim();

      if (!email || !fullName || !password) {
        skipped.push({ index, email, reason: 'Missing email/fullName/password' });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const inserted = await db
          .insertInto('users')
          .values({
            organization_id: organizationId,
            email,
            full_name: fullName,
            password_hash: passwordHash,
            role: 'student',
            is_active: true
          })
          .returning([
            'id',
            'email',
            'full_name as fullName',
            'is_active as isActive',
            'created_at as createdAt'
          ])
          .executeTakeFirst();

        created.push(inserted);
      } catch (error: any) {
        if (error?.code === '23505') {
          skipped.push({ index, email, reason: 'Learner email already exists' });
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
          requested: rows.length,
          created: created.length,
          skipped: skipped.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLearner(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (req as any).db;
    const { organizationId } = getContext(req);
    const learnerId = req.params.id;
    const { fullName, isActive, password } = req.body || {};

    const existing = await db
      .selectFrom('users')
      .select(['id', 'organization_id', 'role'])
      .where('id', '=', learnerId)
      .executeTakeFirst();

    if (!existing || existing.role !== 'student') {
      res.status(404).json({ success: false, error: 'Learner not found' });
      return;
    }

    if (existing.organization_id !== organizationId) {
      res.status(403).json({ success: false, error: 'Access denied to this learner' });
      return;
    }

    const values: any = {};
    if (typeof fullName === 'string' && fullName.trim()) values.full_name = fullName.trim();
    if (typeof isActive === 'boolean') values.is_active = isActive;
    if (typeof password === 'string' && password.trim()) {
      values.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    if (Object.keys(values).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const updated = await db
      .updateTable('users')
      .set(values)
      .where('id', '=', learnerId)
      .returning([
        'id',
        'email',
        'full_name as fullName',
        'is_active as isActive',
        'created_at as createdAt'
      ])
      .executeTakeFirst();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
