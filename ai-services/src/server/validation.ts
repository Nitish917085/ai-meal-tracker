import { z } from 'zod';

export const extractTextSchema = z.object({
  text: z.string().min(1, 'Text is required').max(100_000),
});

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(50),
});
