import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.string().default('3000'),
  JWT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);