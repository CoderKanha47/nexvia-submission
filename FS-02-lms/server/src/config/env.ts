import 'dotenv/config';
import { z } from 'zod';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Find the project root by looking for the data directory.
 * Works regardless of whether the process cwd is the project root or server/.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  // Check current dir and parent for data/hls (project root marker)
  for (let i = 0; i < 3; i++) {
    if (existsSync(resolve(dir, 'data', 'hls'))) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume project root is one level up from server/ if running from server
  return resolve(process.cwd(), '..');
}

const PROJECT_ROOT = findProjectRoot();

function resolveProjectPath(p: string): string {
  return resolve(PROJECT_ROOT, p);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  SERVER_URL: z.string().min(1).default('http://localhost:4000'),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/lms'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRY: z.string().default('1d'),
  AWS_REGION: z.string().optional(),
  S3_UPLOAD_BUCKET: z.string().optional(),
  S3_HLS_BUCKET: z.string().optional(),
  S3_CERT_BUCKET: z.string().optional(),
  CLOUDFRONT_DOMAIN: z.string().optional(),
  CLOUDFRONT_KEY_PAIR_ID: z.string().optional(),
  CLOUDFRONT_PRIVATE_KEY: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_TEST_MODE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  PLATFORM_FEE_PCT: z.coerce.number().min(0).max(100).default(20),
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),
  UPLOAD_DIR: z.string().default('data/uploads').transform(resolveProjectPath),
  HLS_DIR: z.string().default('data/hls').transform(resolveProjectPath),
  CERT_DIR: z.string().default('data/certificates').transform(resolveProjectPath),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  );
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = z.infer<typeof envSchema>;