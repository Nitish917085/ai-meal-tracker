import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as memoryService from '../services/memory.service';
import { memorySchema } from '../validation';

export const memoryRouter = Router();

memoryRouter.use(authenticate);

memoryRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const memories = await memoryService.listMemories(req.user.id);
    res.json({ memories });
  }),
);

memoryRouter.post(
  '/',
  validate(memorySchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { content } = req.body as { content: string };
    const memory = await memoryService.addMemory(req.user.id, content);
    res.status(201).json(memory);
  }),
);

memoryRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    await memoryService.removeMemory(req.user.id, id);
    res.json({ ok: true });
  }),
);
