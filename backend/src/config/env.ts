import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().optional().default(''),
  FIREBASE_PROJECT_ID: z.string().optional().default('medi-bud-app'),
  ALLOWED_ORIGINS: z.string().default('*'),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
});
