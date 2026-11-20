import { NextResponse } from 'next/server';
import { requireUser, handle, rateLimit } from '@/lib/api-helpers';
import { signWsToken } from '@/lib/ws-token';

export const runtime = 'nodejs';

export const POST = handle(async () => {
  const user = await requireUser();
  rateLimit(`ws-token:${user.id}`, 30, 60_000);
  const token = await signWsToken({
    typ: 'user',
    sub: user.id,
    name: user.name,
    email: user.email,
  });
  return NextResponse.json({ token, expiresIn: 3600 });
});
