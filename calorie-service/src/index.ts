import { createApp } from './app';
import { config } from './config';
import { closeDb, initDb } from './db/connection';

async function start(): Promise<void> {
  await initDb();

  const app = createApp();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Calorie Tracker API listening on http://localhost:${config.port}`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
      closeDb()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\nFailed to start server:');
  if (isConnectionError(err)) {
    console.error(
      `  Could not reach PostgreSQL.\n` +
        `  -> Current DATABASE_URL: ${config.database.url}\n` +
        `  -> If this is localhost, start Postgres (e.g. "docker compose up -d").\n` +
        `  -> If this is Supabase, paste the "Transaction pooler" connection string\n` +
        `     (port 6543) from Supabase Dashboard -> Project Settings -> Database.\n`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  process.exit(1);
});

function isConnectionError(err: unknown): boolean {
  if (err instanceof Error) {
    const anyErr = err as { code?: string };
    if (anyErr.code === 'ECONNREFUSED' || anyErr.code === 'ENOTFOUND' || anyErr.code === 'ETIMEDOUT') {
      return true;
    }
  }
  // AggregateError wraps the individual connection failures.
  return err instanceof AggregateError;
}
