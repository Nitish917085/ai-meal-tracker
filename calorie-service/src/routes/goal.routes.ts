import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as goalService from '../services/goal.service';
import type { GoalInput } from '../repositories/goal.repo';
import { goalSchema } from '../validation';

export const goalRouter = Router();

goalRouter.use(authenticate);

goalRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const goals = await goalService.listGoals(req.user.id);
    const active = await goalService.getActiveGoal(req.user.id);
    res.json({ active, history: goals });
  }),
);

goalRouter.post(
  '/',
  validate(goalSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const goal = await goalService.setGoal(req.user.id, req.body as GoalInput);
    res.status(201).json(goal);
  }),
);

goalRouter.put(
  '/:id',
  validate(goalSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const goal = await goalService.updateGoal(req.user.id, id, req.body as GoalInput);
    res.json(goal);
  }),
);
