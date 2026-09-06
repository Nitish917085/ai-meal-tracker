import { pool } from '../db/connection';
import type { UserMemory } from '../types';

interface MemoryDbRow {
  id: number;
  user_id: number;
  content: string;
  created_at: Date;
}

function mapRow(row: MemoryDbRow): UserMemory {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listMemories(userId: number): Promise<UserMemory[]> {
  const { rows } = await pool.query<MemoryDbRow>(
    'SELECT * FROM user_memories WHERE user_id = $1 ORDER BY id DESC',
    [userId],
  );
  return rows.map(mapRow);
}

export async function createMemory(userId: number, content: string): Promise<UserMemory> {
  const { rows } = await pool.query<MemoryDbRow>(
    'INSERT INTO user_memories (user_id, content) VALUES ($1, $2) RETURNING *',
    [userId, content],
  );
  return mapRow(rows[0]);
}

export async function deleteMemory(id: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM user_memories WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
