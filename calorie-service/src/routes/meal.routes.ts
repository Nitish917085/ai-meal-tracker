import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as mealService from '../services/meal.service';
import type { MealFilters, MealInput } from '../repositories/meal.repo';
import { parsePagination } from '../utils/pagination';
import { assertDate } from '../utils/dates';
import type { MealType } from '../types';
import { mealListQuerySchema, mealSchema } from '../validation';

export const mealRouter = Router();

mealRouter.use(authenticate);

mealRouter.get(
  '/',
  validate(mealListQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = req.query as unknown as {
      start?: string;
      end?: string;
      mealType?: MealType;
      page?: number;
      pageSize?: number;
    };

    const filters: MealFilters = {
      start: query.start ? assertDate(query.start, 'start') : undefined,
      end: query.end ? assertDate(query.end, 'end') : undefined,
      mealType: query.mealType,
    };

    const page = parsePagination({ page: query.page, pageSize: query.pageSize });
    res.json(await mealService.listMeals(req.user.id, filters, page));
  }),
);

mealRouter.post(
  '/',
  validate(mealSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const meal = await mealService.createMeal(req.user.id, req.body as MealInput);
    res.status(201).json(meal);
  }),
);

mealRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const meal = await mealService.getMeal(req.user.id, Number(req.params.id));
    res.json(meal);
  }),
);

mealRouter.put(
  '/:id',
  validate(mealSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const meal = await mealService.updateMeal(req.user.id, Number(req.params.id), req.body as MealInput);
    res.json(meal);
  }),
);

mealRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await mealService.deleteMeal(req.user.id, Number(req.params.id));
    res.status(204).end();
  }),
);
