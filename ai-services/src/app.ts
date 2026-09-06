import express from 'express';
import cors from 'cors';
import { config } from './config';
import { aiRouter } from './server/routes';
import { errorHandler, notFoundHandler } from './server/middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Serve uploaded images back to the client.
  app.use('/uploads', express.static(config.uploadsDir));

  if (!config.isProduction) {
    app.use((req, _res, next) => {
      console.log(`[ai] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-service', uptime: process.uptime() });
  });

  app.use('/', aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
