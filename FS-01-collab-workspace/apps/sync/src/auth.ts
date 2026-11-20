import { jwtVerify } from 'jose';
import type { Role, WsTokenClaims } from '@nexvia/shared';
import { config } from './config';

const secret = new TextEncoder().encode(config.WS_TOKEN_SECRET);
const VALID_ROLES = new Set(['OWNER', 'EDIT', 'COMMENT', 'VIEW']);

export async function verifyToken(token: string): Promise<WsTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const typ = payload['typ'];
    if (typ === 'user' && typeof payload['sub'] === 'string') {
      return {
        typ: 'user',
        sub: payload['sub'],
        name: (payload['name'] as string | undefined) ?? null,
        email: payload['email'] as string | undefined,
      };
    }
    if (
      typ === 'share' &&
      typeof payload['sub'] === 'string' &&
      typeof payload['pageId'] === 'string' &&
      typeof payload['role'] === 'string' &&
      VALID_ROLES.has(payload['role'])
    ) {
      return {
        typ: 'share',
        sub: payload['sub'],
        pageId: payload['pageId'],
        role: payload['role'] as Role,
        sid: (payload['sid'] as string | undefined) ?? '',
      };
    }
    return null;
  } catch {
    return null;
  }
}
