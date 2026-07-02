/**
 * Bull queue factory with sensible defaults.
 *
 * Queue naming convention (PO ratified): `<domain>.<action>`
 *   e.g. `notification.send`, `escalation.check`, `email.retry`
 *
 * Job data convention:
 *   Carry minimal context (ID, correlation ID) — not the full domain object.
 *   Consumer service hydrates from DB.
 *
 * Signal handling:
 *   SIGTERM / SIGINT registered at module load (guarded by
 *   `NODE_ENV !== 'test'`) call `void shutdownAllQueues()`. Additive to
 *   T-INFRA-01's `prisma-client` handlers per Node's multi-listener support.
 *
 * Consumer usage:
 *   import { createQueue, registerWorker } from '@core/queue/bull-factory.js';
 *   const queue = createQueue<{ ticketId: string }>('notification.send');
 *   registerWorker(queue, async (job) => { await notify(job.data.ticketId); });
 */

import Bull, { type ProcessCallbackFunction, type Queue } from 'bull';

import { loadConfig } from '@core/config/env.js';
import { ConflictError } from '@core/errors/app-errors.js';

export interface QueueConfig {
  readonly attempts?: number;
  readonly backoff?: { readonly type: 'exponential' | 'fixed'; readonly delay: number };
  readonly removeOnComplete?: number | boolean;
  readonly removeOnFail?: number | boolean;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

const queues = new Map<string, Queue<unknown>>();

export function createQueue<TData>(name: string, config?: QueueConfig): Queue<TData> {
  if (queues.has(name)) {
    throw new ConflictError(`queue '${name}' already created`, { name });
  }
  const cfg = loadConfig();
  const queue = new Bull<TData>(name, cfg.REDIS_URL, {
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...config },
    redis: { db: cfg.REDIS_QUEUE_DB },
  });
  queues.set(name, queue as unknown as Queue<unknown>);
  return queue;
}

export function registerWorker<TData>(
  queue: Queue<TData>,
  processor: ProcessCallbackFunction<TData>,
  concurrency?: number,
): void {
  const cfg = loadConfig();
  const c = concurrency ?? cfg.WORKER_CONCURRENCY_DEFAULT;
  // Bull v4 `.process` returns a Promise<void> that resolves once the processor
  // is wired; we don't need to await it (registration is fire-and-forget from
  // the caller's perspective — the queue immediately begins polling Redis).
  void queue.process(c, processor);
}

export async function shutdownAllQueues(): Promise<void> {
  const snapshot = Array.from(queues.values());
  queues.clear();
  await Promise.all(snapshot.map((q) => q.close()));
}

/* istanbul ignore next -- signal-handler registration is dead under jest's NODE_ENV=test; guard verified indirectly via bull-factory.test.ts `signal handler guard` describe block. */
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => {
    void shutdownAllQueues();
  });
  process.on('SIGINT', () => {
    void shutdownAllQueues();
  });
}
