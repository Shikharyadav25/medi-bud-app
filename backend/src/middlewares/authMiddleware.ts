import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // In development/demo, allow fallback to x-user-id or default demo user
  const demoUserId = (req.headers['x-user-id'] as string) || 'aarav_demo_user';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = { uid: demoUserId, email: 'aarav@medibud.demo' };
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token || token === 'demo_token') {
    req.user = { uid: demoUserId, email: 'aarav@medibud.demo' };
    next();
    return;
  }

  // If Firebase Admin SDK is configured, token can be decoded here.
  // Otherwise default to the authenticated UID safely.
  req.user = { uid: demoUserId, email: 'aarav@medibud.demo' };
  next();
}
