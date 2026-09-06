import { Router } from 'express';
import { authRouter } from './auth.routes';
import { goalRouter } from './goal.routes';
import { mealRouter } from './meal.routes';
import { reportRouter } from './report.routes';
import { importRouter } from './import.routes';
import { seedRouter } from './seed.routes';
import { memoryRouter } from './memory.routes';
import { chatHistoryRouter } from './chatHistory.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/goals', goalRouter);
apiRouter.use('/meals', mealRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/import', importRouter);
apiRouter.use('/seed', seedRouter);
apiRouter.use('/memory', memoryRouter);
apiRouter.use('/chat-history', chatHistoryRouter);
