import { SignJWT, jwtVerify } from 'jose';
import type { WsTokenClaims } from '@nexvia/shared';

function secret(): Uint8Array {
  const s = process.env.WS_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('WS_TOKEN_SECRET (or NEXTAUTH_SECRET) must be set');
  return new TextEncoder().encode(s);
}

export async function signWsToken(
  claims: WsTokenClaims,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .setIssuer('nexvia-web')
    .sign(secret());
}

export async function verifyWsToken(token: string): Promise<WsTokenClaims> {
  const { payload } = await jwtVerify(token, secret(), { issuer: 'nexvia-web' });
  return payload as unknown as WsTokenClaims;
}
