import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id?: string;
      role?: string;
      organizationId?: string;
      email?: string;
      clientId?: string;
      [key: string]: unknown;
    };
    db?: unknown;
  }
}
