import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from './middleware/asyncHandler';
import { validate } from './middleware/validate';
import { badRequest, unauthorized } from './middleware/httpError';
import { extractNutritionFromFile } from '../features/vision';
import { extractNutritionFromText } from '../features/text';
import { handleChat } from '../features/chat';
import { extractTextSchema, chatSchema } from './validation';
import { config } from '../config';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

// Uploads land in the top-level uploads/ directory; the vision service reads from it.
const uploadDir = config.uploadsDir;
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(badRequest('Unsupported file type. Use JPEG, PNG, WebP, GIF or PDF.'));
  },
});

/**
 * Verify the caller's access token against the calorie service BEFORE doing any
 * AI work. The calorie service is the source of truth for auth — this simply
 * asks it "is this token valid?" via GET /auth/me, which runs its authenticate
 * middleware (JWT check + user existence).
 */
async function verifyUserToken(token: string): Promise<void> {
  if (!token) throw unauthorized('Missing authorization token');

  let response: Response;
  try {
    response = await fetch(`${config.calorieServiceUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw unauthorized('Could not reach the calorie service to verify the token');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw unauthorized((data as { error?: string } | null)?.error ?? 'Invalid or expired token');
  }
}

export const aiRouter = Router();

aiRouter.post(
  '/extract',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    await verifyUserToken(token);

    const file = req.file;
    if (!file) throw badRequest('A file is required (field name: "file")');

    const result = await extractNutritionFromFile(file.path, file.mimetype, file.originalname);
    res.json({ ...result, file: { name: file.filename, url: `/uploads/${file.filename}` } });
  }),
);

aiRouter.post(
  '/extract-text',
  validate(extractTextSchema),
  asyncHandler(async (req, res) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    await verifyUserToken(token);

    const { text } = req.body as { text: string };
    const result = await extractNutritionFromText(text);
    res.json(result);
  }),
);

aiRouter.post(
  '/chat',
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const { messages } = req.body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };
    // Forward the caller's access token to the calorie service for tool execution.
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

    // Verify the token up front so an expired/invalid token fails immediately
    // (401) rather than mid-agent, where it would be turned into a chat reply.
    await verifyUserToken(token);

    const result = await handleChat(token, messages);
    res.json(result);
  }),
);
