import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

// Runs before test file imports (setupFiles execute first), ensuring
// DATABASE_URL / WS_TOKEN_SECRET are present when @nexvia/db initializes.
const candidates = [resolve(process.cwd(), '../.env'), resolve(process.cwd(), '.env')];
for (const path of candidates) {
  if (existsSync(path)) {
    loadEnv({ path });
    break;
  }
}
