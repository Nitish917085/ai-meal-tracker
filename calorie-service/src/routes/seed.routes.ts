import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { seedUserData } from '../services/seed.service';
import * as mealService from '../services/meal.service';

const seedSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
});

export const seedRouter = Router();

seedRouter.use(authenticate);

/**
 * Generate demo data for the authenticated user (dev/testing convenience).
 * Creates an active goal if missing and populates meals for the last N days.
 */
seedRouter.post(
  '/',
  validate(seedSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { days } = req.body as { days?: number };
    const result = await seedUserData(req.user.id, days ?? 30);
    res.status(201).json(result);
  }),
);

/** Delete only the user's seeded (demo) food entries. */
seedRouter.delete(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const deleted = await mealService.deleteSeededMeals(req.user.id);
    res.json({ deleted });
  }),
);
