import 'dotenv/config';

/**
 * Central configuration for the calorie service (the main app). AI-related
 * configuration and image uploads live in the separate `ai-services` project.
 */
const env = process.env;

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

const databaseUrl =
  env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/calorie_tracker';

/** Supabase (and most managed Postgres) require SSL connections. */
const isSupabase = databaseUrl.includes('supabase.co');

export const config = {
  port: Number(env.PORT ?? 4000),
  nodeEnv: env.NODE_ENV ?? 'development',
  isProduction: env.NODE_ENV === 'production',
  database: {
    url: databaseUrl,
    poolMax: Number(env.DB_POOL_MAX ?? 10),
    // Auto-enable SSL for Supabase URLs; override with DATABASE_SSL for other hosts.
    ssl: bool(env.DATABASE_SSL, isSupabase),
  },
  jwt: {
    secret: env.JWT_SECRET ?? 'dev-secret-change-me-in-production',
    // Short-lived access token + longer-lived rotating refresh token.
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  supabase: {
    url: env.SUPABASE_URL ?? '',
    anonKey: env.SUPABASE_ANON_KEY ?? '',
    // The service-role key bypasses RLS and must never be exposed to the client.
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  // Standalone AI service (vision/text extraction + chat) that this service
  // can call from its own logic (server-to-server, no public proxy routes).
  aiServiceUrl: env.AI_SERVICE_URL ?? 'http://localhost:4001',
  // When true, password-reset skips OTP email verification (dev only).
  bypassFullAuth: bool(env.BYPASS_FULL_AUTH, false),
  mail: {
    user: env.EMAIL_USER ?? '',
    pass: env.EMAIL_PASS ?? '',
  },
} as const;

/** Whether the Supabase JS client (Auth, Realtime, Storage) is configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}
