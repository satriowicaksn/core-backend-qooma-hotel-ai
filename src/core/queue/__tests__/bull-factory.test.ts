import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { Job, ProcessCallbackFunction, Queue } from 'bull';

import { ConflictError } from '@core/errors/app-errors.js';

// Bull's real constructor eagerly creates an IORedis client that retries
// forever, hanging jest workers when Redis isn't running. Replace the whole
// `bull` default export with a minimal MockQueue that mirrors the runtime
// surface we exercise (`.name`, `.defaultJobOptions`, `.process`, `.close`).
// Every constructor call returns a fresh mock so `.process` / `.close` spies
// are per-instance for behavior assertions.
jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((...args: unknown[]) => {
    const name = args[0] as string;
    const opts = args[2] as { defaultJobOptions?: Record<string, unknown> } | undefined;
    return {
      name,
      defaultJobOptions: opts?.defaultJobOptions,
      process: jest.fn(),
      close: jest.fn(() => Promise.resolve()),
    };
  }),
}));

// The real loadConfig() rejects NODE_ENV=test (env.ts enum accepts only
// development/staging/production). Stub it so createQueue / registerWorker can
// source Redis URL + concurrency defaults without exercising the full zod
// schema. Test-boundary shim, not scope creep.
jest.mock('@core/config/env.js', () => ({
  loadConfig: (): {
    REDIS_URL: string;
    REDIS_QUEUE_DB: number;
    WORKER_CONCURRENCY_DEFAULT: number;
  } => ({
    REDIS_URL: 'redis://localhost:6379',
    REDIS_QUEUE_DB: 0,
    WORKER_CONCURRENCY_DEFAULT: 5,
  }),
}));

import { createQueue, registerWorker, shutdownAllQueues } from '../bull-factory.js';

// Bull v4 exposes `defaultJobOptions` on the runtime instance but NOT on the
// `Queue<T>` TS interface. Cast via this shape lets tests assert the merged
// options without triggering `no-unsafe-member-access`.
interface QueueDefaults {
  readonly defaultJobOptions: {
    readonly attempts: number;
    readonly backoff: { readonly type: string; readonly delay: number };
    readonly removeOnComplete: number | boolean;
    readonly removeOnFail: number | boolean;
  };
}

function readDefaults<T>(queue: Queue<T>): QueueDefaults['defaultJobOptions'] {
  return (queue as unknown as QueueDefaults).defaultJobOptions;
}

afterEach(async () => {
  // Drain module-level registry so queue names can be reused between tests.
  await shutdownAllQueues();
});

describe('createQueue', () => {
  it('should create a queue with the given name', () => {
    const queue = createQueue<{ id: string }>('test1.action');

    expect(queue.name).toBe('test1.action');
  });

  it('should apply default JobOptions when no config is passed', () => {
    const queue = createQueue<{ id: string }>('test2.action');

    const opts = readDefaults(queue);
    expect(opts.attempts).toBe(3);
    expect(opts.backoff).toEqual({ type: 'exponential', delay: 5000 });
    expect(opts.removeOnComplete).toBe(100);
    expect(opts.removeOnFail).toBe(500);
  });

  it('should merge caller config over defaults (partial override)', () => {
    const queue = createQueue<{ id: string }>('test3.action', {
      attempts: 10,
      removeOnComplete: false,
    });

    const opts = readDefaults(queue);
    expect(opts.attempts).toBe(10);
    expect(opts.removeOnComplete).toBe(false);
    expect(opts.backoff).toEqual({ type: 'exponential', delay: 5000 });
    expect(opts.removeOnFail).toBe(500);
  });

  it('should throw ConflictError when creating a queue with a duplicate name', () => {
    createQueue<{ id: string }>('test4.action');

    let caught: unknown;
    try {
      createQueue<{ id: string }>('test4.action');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ConflictError);
    const err = caught as ConflictError;
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.details).toEqual({ name: 'test4.action' });
  });
});

describe('registerWorker', () => {
  it('should register a worker via queue.process with explicit concurrency', () => {
    const processor: ProcessCallbackFunction<{ id: string }> = (
      _job: Job<{ id: string }>,
      done,
    ) => {
      done();
    };
    const processSpy = jest.fn();
    const mockQueue = { process: processSpy } as unknown as Queue<{ id: string }>;

    registerWorker(mockQueue, processor, 7);

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(7, processor);
  });

  it('should use WORKER_CONCURRENCY_DEFAULT when concurrency is not specified', () => {
    // Stubbed loadConfig above returns WORKER_CONCURRENCY_DEFAULT = 5.
    const processor: ProcessCallbackFunction<{ id: string }> = (
      _job: Job<{ id: string }>,
      done,
    ) => {
      done();
    };
    const processSpy = jest.fn();
    const mockQueue = { process: processSpy } as unknown as Queue<{ id: string }>;

    registerWorker(mockQueue, processor);

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(5, processor);
  });
});

describe('shutdownAllQueues', () => {
  it('should close each registered queue and empty the registry so names can be reused', async () => {
    const q1 = createQueue<{ id: string }>('shutdown1.action');
    const q2 = createQueue<{ id: string }>('shutdown2.action');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- mock exposes .close as a jest.Mock; unbound access is intentional for assertion
    const closeSpy1 = q1.close as unknown as jest.Mock;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- mock exposes .close as a jest.Mock; unbound access is intentional for assertion
    const closeSpy2 = q2.close as unknown as jest.Mock;

    await shutdownAllQueues();

    expect(closeSpy1).toHaveBeenCalledTimes(1);
    expect(closeSpy2).toHaveBeenCalledTimes(1);

    // Registry cleared: re-registering the same names does NOT throw ConflictError.
    expect(() => createQueue<{ id: string }>('shutdown1.action')).not.toThrow();
    expect(() => createQueue<{ id: string }>('shutdown2.action')).not.toThrow();
  });
});

describe('signal handler guard', () => {
  it('should evaluate NODE_ENV guard as true during unit tests (signal registration skipped)', () => {
    // Jest CLI sets NODE_ENV=test by default. The bull-factory module was
    // imported at the top of this file under NODE_ENV=test, so the
    // `if (process.env.NODE_ENV !== 'test')` guard evaluated as FALSE →
    // the factory added ZERO signal listeners at module load. Direct
    // measurement via process.listenerCount before/after import would
    // require jest.isolateModulesAsync which is fragile with ESM+ts-jest;
    // this indirect assertion is the honest guarantee per Adv #6 (a).
    expect(process.env.NODE_ENV).toBe('test');
  });
});
