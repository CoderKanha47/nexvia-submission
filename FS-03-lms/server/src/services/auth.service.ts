import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { UserModel, type UserDoc, type UserRole } from '../models/user.model';
import { AppError } from '../utils/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';

export const REFRESH_COOKIE_NAME = 'lms_rt';
export const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_ROUNDS = 10;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    isActive: user.isActive,
  };
}

function issueTokens(user: UserDoc): { accessToken: string; refreshToken: string } {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const { token: refreshToken } = signRefreshToken(user.id);
  return { accessToken, refreshToken };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'instructor';
}): Promise<AuthResult> {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new AppError(409, 'CONFLICT', 'Email is already registered');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role ?? 'student',
  });

  const { accessToken, refreshToken } = issueTokens(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select(
    '+passwordHash',
  );
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');

  const { accessToken, refreshToken } = issueTokens(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string | undefined): Promise<AuthResult> {
  if (!refreshToken) throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const user = await UserModel.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || !user.refreshTokenHash) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const expected = Buffer.from(user.refreshTokenHash, 'utf8');
  const actual = Buffer.from(hashToken(refreshToken), 'utf8');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const { accessToken, refreshToken: newRefresh } = issueTokens(user);
  user.refreshTokenHash = hashToken(newRefresh);
  await user.save();

  return { user: toPublicUser(user), accessToken, refreshToken: newRefresh };
}

export async function logoutUser(userId: string, refreshToken?: string): Promise<void> {
  const user = await UserModel.findById(userId).select('+refreshTokenHash');
  if (!user) return;

  if (refreshToken && user.refreshTokenHash) {
    const expected = Buffer.from(user.refreshTokenHash, 'utf8');
    const actual = Buffer.from(hashToken(refreshToken), 'utf8');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return;
  }

  user.refreshTokenHash = undefined;
  await user.save();
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
  return toPublicUser(user);
}

export function refreshCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAgeSec: number;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAgeSec: REFRESH_MAX_AGE_SEC,
  };
}
