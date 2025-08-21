import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main, run } from '../src/run';
import { HttpError, TaggedError } from '../src/utils/logging';

describe('run.ts', () => {
  let realFetch: typeof fetch;

  beforeEach(async () => {
    vi.clearAllMocks();

    realFetch = global.fetch;

    vi.spyOn(global, 'fetch').mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('api.buttondown.email')) {
          return new Response(JSON.stringify({ id: 'test-123', status: 'scheduled' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Delegate to the real fetch for everything else
        return realFetch(input, init);
      }
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Pipeline execution', () => {
    beforeEach(async () => {
      vi.stubEnv('SEND_ENABLED', 'true');
      vi.stubEnv('BUTTONDOWN_API_KEY', 'bd_live_key_123');
    });

    it('should run successfully', async () => {
      await expect(main()).resolves.not.toThrow();
    });

    it('should logs HTTP errors', async () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
        throw new HttpError('tag', 'message', new Response(null, { status: 500 }));
      });

      await expect(run()).resolves.not.toThrow();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('message'));
    });

    it('should logs tagged errors', async () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
        throw new TaggedError('tag', 'message');
      });

      await expect(run()).resolves.not.toThrow();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('message'));
    });

    it('should throw unhandled errors', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
        throw new Error('message');
      });

      await expect(run()).rejects.toThrow('message');
    });
  });
});
