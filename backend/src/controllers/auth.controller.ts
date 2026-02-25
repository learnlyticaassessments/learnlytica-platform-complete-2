import { Request, Response } from 'express';
import { getUserById, loginWithPassword } from '../services/auth.service';

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await loginWithPassword((req as any).db, email, password);

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    const message = error?.message || 'Login failed';
    const status = message.includes('Invalid email or password') ? 401 : 500;

    return res.status(status).json({
      success: false,
      error: message
    });
  }
}

export async function meHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await getUserById((req as any).db, userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load user'
    });
  }
}

