import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import type { BusEvent } from '@nexvia/shared';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    publisher.on('error', (err) => console.error('[bus] redis error', err.message));
  }
  return publisher;
}

function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    subscriber.on('error', (err) => console.error('[bus] redis subscriber error', err.message));
  }
  return subscriber;
}

export const BUS_CHANNEL = 'nexvia:bus';

export async function publishBus(event: BusEvent): Promise<void> {
  try {
    await getPublisher().publish(BUS_CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.error('[bus] publish failed', err);
  }
}

/**
 * Asks every sync instance holding the page to flush its in-memory document to
 * Postgres, then resolves on the first flush-ack (or after the timeout, e.g.
 * when no instance has the room open — the debounced save may already be
 * current). Used before reading a document state for versioning.
 */
export async function flushPage(pageId: string, timeoutMs = 2500): Promise<void> {
  const replyTo = randomUUID();
  const s = getSubscriber();
  try {
    await s.subscribe(BUS_CHANNEL);
  } catch (err) {
    console.error('[bus] flush subscribe failed', err);
    return;
  }

  const done = new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    const onMessage = (channel: string, message: string): void => {
      if (channel !== BUS_CHANNEL) return;
      try {
        const event = JSON.parse(message) as BusEvent;
        if (event.type === 'flush-ack' && event.replyTo === replyTo) {
          cleanup();
          resolve();
        }
      } catch {
        /* ignore malformed */
      }
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      s.off('message', onMessage);
    };
    s.on('message', onMessage);
  });

  await publishBus({ type: 'flush', pageId, replyTo });
  await done;
  try {
    await s.unsubscribe(BUS_CHANNEL);
  } catch {
    /* noop */
  }
}
