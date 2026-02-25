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

