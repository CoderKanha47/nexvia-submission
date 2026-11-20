import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envExample = resolve(root, '.env.example');
const env = resolve(root, '.env');
const webEnvLocal = resolve(root, 'apps/web/.env.local');

if (!existsSync(env)) {
  copyFileSync(envExample, env);
  console.log('[setup] Created .env from .env.example — please change the secrets.');
} else {
  console.log('[setup] .env already exists, skipping.');
}

if (!existsSync(webEnvLocal)) {
  copyFileSync(envExample, webEnvLocal);
  console.log('[setup] Created apps/web/.env.local from .env.example.');
} else {
  console.log('[setup] apps/web/.env.local already exists, skipping.');
}
