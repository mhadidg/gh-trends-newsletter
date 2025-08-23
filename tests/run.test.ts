import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main, run } from '../src/run';
import { HttpError, TaggedError } from '../src/utils/logging';
import { GitHubRepoResponse } from '../src/clients/github';
import { ClickHouseResponse } from '../src/clients/clickhouse';

describe('run.ts', () => {
  let realFetch: typeof fetch;

  beforeEach(async () => {
    vi.clearAllMocks();

    realFetch = global.fetch;

    vi.spyOn(global, 'fetch').mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();

        // Sending email via Buttondown
        if (url.includes('api.buttondown.email')) {
          return new Response(JSON.stringify({ id: 'test-123', status: 'scheduled' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Query ClickHouse playground
        if (url.includes('play.clickhouse.com')) {
          const response = {
            data: [{ repo_name: 'repo', appeared_at: '' }],
            statistics: { rows_read: 2 },
          } as ClickHouseResponse;

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Fetching GitHub repository details
        if (url.includes('api.github.com/repos') && !url.includes('/releases')) {
          const response = {
            id: 'repo-123',
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
            description: 'A test repository',
            language: null,
            created_at: new Date().toString(),
            stargazers_count: 42,
          } as GitHubRepoResponse;

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Creating a GitHub release
        if (url.includes('api.github.com/repos') && url.includes('/releases')) {
          return new Response(JSON.stringify({ id: 12345 }), {
            status: 201,
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
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SEND_ENABLED', 'true');
      vi.stubEnv('BUTTONDOWN_API_KEY', 'bd_live_key_123');
      vi.stubEnv('GITHUB_RELEASES_ENABLED', 'true');
      vi.stubEnv('GITHUB_RELEASES_REPO', 'test/repo');
      vi.stubEnv('GITHUB_TOKEN', 'ghp_test_token_123');
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
