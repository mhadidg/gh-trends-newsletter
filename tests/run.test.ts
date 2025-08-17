import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/run';

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
    it('should run successfully', async () => {
      vi.stubEnv('SEND_ENABLED', 'true');
      vi.stubEnv('BUTTONDOWN_API_KEY', 'bd_live_key_123');

      await expect(main()).resolves.not.toThrow();
    });
  });
});
