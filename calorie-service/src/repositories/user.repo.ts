import { pool } from '../db/connection';
import type { User } from '../types';

interface UserDbRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  email_verified: boolean;
  created_at: Date;
}

export interface UserWithHash {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
}

function mapRow(row: UserDbRow): UserWithHash {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    emailVerified: row.email_verified,
    createdAt: row.created_at.toISOString(),
  };
}

export function toPublicUser(row: UserWithHash): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt };
}

export async function findUserByEmail(email: string): Promise<UserWithHash | undefined> {
  const { rows } = await pool.query<UserDbRow>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function findUserById(id: number): Promise<UserWithHash | undefined> {
  const { rows } = await pool.query<UserDbRow>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function createUser(email: string, passwordHash: string, name: string): Promise<UserWithHash> {
  const { rows } = await pool.query<UserDbRow>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email.toLowerCase(), passwordHash, name],
  );
  return mapRow(rows[0]);
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
}

export async function markEmailVerified(id: number): Promise<void> {
  await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [id]);
}
