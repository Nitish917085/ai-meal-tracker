import express from 'express';
import cors from 'cors';
import { pool } from './db/connection';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  if (!config.isProduction) {
    app.use((req, _res, next) => {
      console.log(`[http] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'up', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down', uptime: process.uptime() });
    }
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
