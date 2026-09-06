import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as chatHistoryService from '../services/chatHistory.service';
import { chatHistoryAppendSchema } from '../validation';
import { parsePagination } from '../utils/pagination';
import type { ChatHistoryMessage } from '../types';

export const chatHistoryRouter = Router();

chatHistoryRouter.use(authenticate);

chatHistoryRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = parsePagination({ page: req.query.page, pageSize: req.query.pageSize });
    res.json(await chatHistoryService.listChatHistory(req.user.id, page));
  }),
);

chatHistoryRouter.post(
  '/',
  validate(chatHistoryAppendSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { messages } = req.body as { messages: ChatHistoryMessage[] };
    await chatHistoryService.appendChatHistory(req.user.id, messages);
    res.status(201).json({ ok: true });
  }),
);

chatHistoryRouter.delete(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    await chatHistoryService.clearChatHistory(req.user.id);
    res.json({ ok: true });
  }),
);
