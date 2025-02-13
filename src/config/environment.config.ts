import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'testing', 'staging', 'production'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  HEADLESS: z.string().transform(val => val === 'true').default('true'),
  TARGET_URL: z.string().url(),
  
  SCREENSHOT_PATH: z.string().default('./screenshots'),
  SAVE_SCREENSHOTS: z.string().transform(val => val === 'true').default('false'),
});

const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error: any) {
    console.error('Invalid environment variables:', error.errors);
    process.exit(1);
  }
};

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;