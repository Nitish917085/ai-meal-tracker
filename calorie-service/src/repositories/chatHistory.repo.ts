import { pool } from '../db/connection';
import type { ChatHistoryMessage } from '../types';
import type { PageQuery } from '../utils/pagination';

interface ChatMessageDbRow {
  role: 'user' | 'assistant';
  content: string;
  image_url: string | null;
  file_name: string | null;
}

export interface ChatHistoryListResult {
  /** Newest-first page of messages. */
  messages: ChatHistoryMessage[];
  total: number;
}

export async function listMessages(userId: number, page: PageQuery): Promise<ChatHistoryListResult> {
  const { rows: countRows } = await pool.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM chat_messages WHERE user_id = $1',
    [userId],
  );
  const total = countRows[0].count;

  const { rows } = await pool.query<ChatMessageDbRow>(
    'SELECT role, content, image_url, file_name FROM chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3',
    [userId, page.pageSize, page.offset],
  );
  return {
    messages: rows.map((row) => ({
      role: row.role,
      content: row.content,
      imageUrl: row.image_url,
      fileName: row.file_name,
    })),
    total,
  };
}

/** Append messages in order (a user turn + the assistant reply). */
export async function appendMessages(
  userId: number,
  messages: ChatHistoryMessage[],
): Promise<void> {
  for (const message of messages) {
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content, image_url, file_name) VALUES ($1, $2, $3, $4, $5)',
      [userId, message.role, message.content, message.imageUrl ?? null, message.fileName ?? null],
    );
  }
}

export async function clearMessages(userId: number): Promise<void> {
  await pool.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
}
