import type { Request, Response } from 'express';
import {
  REFRESH_COOKIE_NAME,
  getMe,
  loginUser,
  logoutUser,
  refreshCookieOptions,
  refreshSession,
  registerUser,
} from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler';
import { clearCookie, parseCookies, serializeCookie } from '../utils/cookie';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  res.setHeader('Set-Cookie', serializeCookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions()));
  res
    .status(201)
    .json({ data: { user: result.user, accessToken: result.accessToken } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  res.setHeader('Set-Cookie', serializeCookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions()));
  res.json({ data: { user: result.user, accessToken: result.accessToken } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
  const result = await refreshSession(token);
  res.setHeader('Set-Cookie', serializeCookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions()));
  res.json({ data: { accessToken: result.accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
  if (req.user) await logoutUser(req.user.id, token);
  res.setHeader('Set-Cookie', clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions()));
  res.json({ data: { ok: true } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await getMe(req.user!.id);
  res.json({ data: user });
});
