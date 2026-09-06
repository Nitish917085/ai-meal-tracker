import { pool } from '../db/connection';

export interface RefreshTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface RefreshTokenDbRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

function mapRow(row: RefreshTokenDbRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/** Persist a hashed refresh token with its absolute expiry. */
export async function createRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | undefined> {
  const { rows } = await pool.query<RefreshTokenDbRow>(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

/** Mark a refresh token revoked (idempotent — only if not already revoked). */
export async function revokeRefreshToken(tokenHash: string): Promise<boolean> {
  const result = await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Revoke every active refresh token for a user (e.g. on logout-all / password change). */
export async function revokeAllForUser(userId: number): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
}

/** Housekeeping: drop expired rows. Call periodically or in a background job. */
export async function deleteExpired(): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < now()');
}
