import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Lazily-created Supabase JS client.
 *
 * The `pg` connection in `db/connection.ts` remains the data-access layer for
 * raw SQL (PostgREST cannot execute arbitrary SQL). This client unlocks the
 * Supabase value-adds — Auth, Realtime, Storage, and RPC — while sharing the
 * same hosted Postgres underneath.
 *
 * It is created on demand and only when `SUPABASE_URL` + a key are configured,
 * so the app still runs against a plain local Postgres with no Supabase account.
 */
let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const { url, serviceRoleKey, anonKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    client = null;
    return client;
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      // Server-side usage: no browser session persistence.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Optional: include the anon key for features that need it.
        ...(anonKey ? { apikey: anonKey } : {}),
      },
    },
  });

  return client;
}

/** Throws a clear error if Supabase isn't configured (for features that require it). */
export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  return supabase;
}
