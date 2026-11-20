import type { RequestHandler } from 'express';
import { UserModel, type UserRole } from '../models/user.model';
import { AppError } from '../utils/errors';
import { verifyAccessToken } from '../utils/token';

export interface AuthPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function extractBearer(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Missing access token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const isExpired = err instanceof Error && (err.name === 'TokenExpiredError' || err.message.includes('expired'));
      throw new AppError(401, isExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED', 'Invalid or expired access token');
    }

    const user = await UserModel.findById(payload.sub);
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    if (!user.isActive) throw new AppError(403, 'FORBIDDEN', 'Account is deactivated');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Missing access token'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient role'));
      return;
    }
    next();
  };
}