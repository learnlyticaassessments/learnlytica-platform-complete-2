import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  organizationId: string;
  role: 'admin' | 'client' | 'student';
  email: string;
  fullName: string;
}

function mapUser(row: any): AuthUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    role: row.role,
    email: row.email,
    fullName: row.full_name
  };
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'your-secret-key';
}

export async function loginWithPassword(db: any, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const row = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', normalizedEmail)
    .where('is_active', '=', true)
    .executeTakeFirst();

  if (!row) {
    throw new Error('Invalid email or password');
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw new Error('Invalid email or password');
  }

  const user = mapUser(row);

  const token = jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return { token, user };
}

export async function getUserById(db: any, userId: string): Promise<AuthUser | null> {
  const row = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .where('is_active', '=', true)
    .executeTakeFirst();

  return row ? mapUser(row) : null;
}

