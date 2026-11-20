import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { validateServerEnv, type ServerEnv } from '@nexvia/shared';

// Load monorepo root .env regardless of the process cwd.
loadEnv({ path: resolve(__dirname, '../../../.env') });

export const config: ServerEnv = validateServerEnv(process.env);
