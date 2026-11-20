import { Router } from 'express';
import { z } from 'zod';
import { login, logout, me, refresh, register } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { validateBody } from '../middleware/validate.middleware';

const emailSchema = z.email('Invalid email').max(254);
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['student', 'instructor']).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

export const authRouter = Router();

const authLimiter = rateLimit({ windowSec: 900, max: 60 });

authRouter.post('/register', authLimiter, validateBody(registerSchema), register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), login);
authRouter.post('/refresh', authLimiter, refresh);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, me);
