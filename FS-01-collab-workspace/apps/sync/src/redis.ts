import Redis from 'ioredis';
import { createLogger, type BusEvent } from '@nexvia/shared';
import { config } from './config';

const log = createLogger('sync:redis');

export const INSTANCE_ID = config.INSTANCE_ID ?? `sync-${process.pid}`;
export const BUS_CHANNEL = 'nexvia:bus';

export function roomChannel(room: string): string {
  return `nexvia:room:${room}`;
}

let pub: Redis | null = null;
let sub: Redis | null = null;

export function getPublisher(): Redis {
  if (!pub) {
    pub = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    pub.on('error', (e) => log.error('publisher error', { err: e.message }));
  }
  return pub;
}

export function getSubscriber(): Redis {
  if (!sub) {
    sub = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    sub.on('error', (e) => log.error('subscriber error', { err: e.message }));
  }
  return sub;
}

export async function publishRoom(room: string, payload: Buffer): Promise<void> {
  try {
    // ioredis delivers pub/sub messages as UTF-8 strings, which corrupts
    // binary CRDT payloads. Base64 keeps them loss-free on the wire.
    await getPublisher().publish(roomChannel(room), payload.toString('base64'));
  } catch (err) {
    log.error('room publish failed', { room, err: String(err) });
  }
}

export async function publishBus(event: BusEvent): Promise<void> {
  try {
    await getPublisher().publish(BUS_CHANNEL, JSON.stringify(event));
  } catch (err) {
    log.error('bus publish failed', { err: String(err) });
  }
}

export async function subscribeRooms(
  onRoom: (room: string, message: Buffer) => void,
  onBus: (event: BusEvent) => void,
): Promise<void> {
  const s = getSubscriber();
  await s.psubscribe('nexvia:room:*');
  await s.subscribe(BUS_CHANNEL);
  s.on('pmessage', (_pattern, channel, message) => {
    const room = channel.slice('nexvia:room:'.length);
    onRoom(room, Buffer.from(message, 'base64'));
  });
  s.on('message', (channel, message) => {
    if (channel === BUS_CHANNEL) {
      try {
        onBus(JSON.parse(message) as BusEvent);
      } catch (err) {
        log.error('bad bus message', { err: String(err) });
      }
    }
  });
}
