import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as reportService from '../services/report.service';
import { parseDateRange } from '../utils/dates';
import { reportQuerySchema } from '../validation';

export const reportRouter = Router();

reportRouter.use(authenticate);

function parseRange(req: AuthedRequest): { start: string; end: string } {
  const query = req.query as unknown as { start?: string; end?: string };
  return parseDateRange(query.start, query.end, 7);
}

reportRouter.get(
  '/daily',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { start, end } = parseRange(req);
    res.json({ data: await reportService.getDailyTotals(req.user.id, start, end) });
  }),
);

reportRouter.get(
  '/macros',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { start, end } = parseRange(req);
    res.json(await reportService.getMacroBreakdown(req.user.id, start, end));
  }),
);

reportRouter.get(
  '/micronutrients',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { start, end } = parseRange(req);
    res.json(await reportService.getMicronutrientSummary(req.user.id, start, end));
  }),
);

reportRouter.get(
  '/goal-comparison',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { start, end } = parseRange(req);
    res.json(await reportService.getGoalComparison(req.user.id, start, end));
  }),
);
