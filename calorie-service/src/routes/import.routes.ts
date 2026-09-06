import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as mealService from '../services/meal.service';
import type { MealInput } from '../repositories/meal.repo';
import { importSchema } from '../validation';

/**
 * Bulk import of food entries. The frontend sends AI-extracted entries
 * (from PDFs, images, or text), which are persisted here with their
 * vitamins/minerals intact.
 */
export const importRouter = Router();

importRouter.use(authenticate);

importRouter.post(
  '/entries',
  validate(importSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { entries } = req.body as { entries: MealInput[] };

    const created = await Promise.all(
      entries.map((entry) => mealService.createMeal(req.user.id, entry)),
    );

    res.status(201).json({ imported: created.length, items: created });
  }),
);

