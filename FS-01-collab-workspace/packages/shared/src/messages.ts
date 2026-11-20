import type { Role } from './permissions';

/** Claims embedded into short-lived WebSocket auth tokens. */
export type WsTokenClaims =
  | { typ: 'user'; sub: string; name?: string | null; email?: string; picture?: string | null }
  | { typ: 'share'; sub: string; pageId: string; role: Role; sid: string };

export type WsCustomServerMessage =
  | { type: 'doc:reset'; pageId: string; epoch: number; reason: string }
  | { type: 'perm:role'; pageId: string; role: Role | null }
  | { type: 'hello'; instanceId: string };

export type WsCustomClientMessage = { type: 'ping' };

export type BusEvent =
  | { type: 'flush'; pageId: string; replyTo: string }
  | { type: 'flush-ack'; pageId: string; instanceId: string; replyTo: string }
  | { type: 'doc:reset'; pageId: string; epoch: number; reason: string }
  | { type: 'perm:changed'; pageId: string; userId: string }
  | { type: 'page:changed'; workspaceId: string; pageId: string; action: string }
  | { type: 'comment:changed'; pageId: string; threadId?: string }
  | { type: 'version:changed'; pageId: string }
  | { type: 'workspace:members-changed'; workspaceId: string };
