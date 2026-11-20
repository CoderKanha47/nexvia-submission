import { Router } from 'express';
import {
  currentUser,
  getUsers,
  suspendUser,
} from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', currentUser);
userRouter.get('/', requireRole('admin'), getUsers);
userRouter.patch('/:userId/suspend', requireRole('admin'), suspendUser);