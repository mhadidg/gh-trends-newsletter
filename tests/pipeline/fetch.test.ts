import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _fetch } from '../../src/pipeline/fetch';
import { HttpError } from '../../src/utils/logging';

describe('fetch.ts', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks(); // reset mocks
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe('Mocking', () => {
    it('should return mock data in test', async () => {
      await _fetch();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return mock data in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      await _fetch();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return mock data when NODE_ENV is undefined', async () => {
      vi.stubEnv('NODE_ENV', undefined);

      await _fetch();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('ClickHouse API', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('GITHUB_TOKEN', 'ghp_valid_token_123');
    });

    it('should make well-formed request', async () => {
      vi.stubEnv('FETCH_WINDOW_DAYS', '7');
      vi.stubEnv('NEWSLETTER_TOP_N', '10');

      // Mock ClickHouse response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      });

      await _fetch();

      const [url, options] = mockFetch.mock.calls[0] as Parameters<typeof fetch>;

      expect(url).toBe('https://play.clickhouse.com/?user=play');
      expect(options!.method).toBe('POST');
      expect(options!.body).toEqual(expect.stringContaining('INTERVAL 7 DAY'));
      expect(options!.body).toEqual(expect.stringContaining('30 AS LIMIT_N')); // topN * 3
    });

    it('should handle empty results', async () => {
      // Mock ClickHouse response with empty data
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      });

      const result = await _fetch();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should throw on JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('invalid JSON')),
      });

      await expect(_fetch()).rejects.toThrow('invalid JSON');
    });

    it('should throw on network errors', async () => {
      mockFetch.mockRejectedValue(new Error('network error'));

      await expect(_fetch()).rejects.toThrow('network error');
    });

    it('should throw on 5xx HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      });

      await expect(_fetch()).rejects.toThrowError(HttpError);
    });
  });

  describe('GitHub API', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('GITHUB_TOKEN', 'ghp_valid_token_123');
    });

    it('should throw when GITHUB_TOKEN is missing', async () => {
      vi.stubEnv('GITHUB_TOKEN', undefined);

      await expect(_fetch()).rejects.toThrow('GITHUB_TOKEN var required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw when GITHUB_TOKEN is empty', async () => {
      vi.stubEnv('GITHUB_TOKEN', '');

      await expect(_fetch()).rejects.toThrow('GITHUB_TOKEN var required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should make well-formed request', async () => {
      // Mock ClickHouse response first
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          // At least one result is required to trigger GitHub API
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Then mock GitHub API response
        .mockResolvedValueOnce({
          ok: true,
          // Should be a valid response; schema is validated
          // Validates schema parsing implicitly
          json: vi.fn().mockResolvedValue({
            id: 123,
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
            description: 'Test repo',
            language: 'TypeScript',
            created_at: '2024-12-15T10:30:00Z',
          }),
        });

      await _fetch();

      expect(mockFetch).toHaveBeenNthCalledWith(
        2, // second call for GitHub API
        'https://api.github.com/repos/test/repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_valid_token_123',
            Accept: 'application/vnd.github+json',
          }),
        })
      );
    });

    it('should handle missing optional fields', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Mock GitHub API response
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 123,
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
            created_at: '2024-12-15T10:30:00Z',
            description: null, // optional
            language: null, // optional
          }),
        });

      const result = await _fetch();

      expect(result).toHaveLength(1);
      expect(result[0]!.primaryLanguage).toBeNull();
      expect(result[0]!.description).toBeNull();
    });

    it('should enrich ClickHouse result', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [
              { repo_name: 'owner1/repo1', stars: 150, appeared_at: '2024-12-15' },
              { repo_name: 'owner2/repo2', stars: 200, appeared_at: '2024-12-14' },
            ],
          }),
        })
        // Mock first GitHub API response
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 123,
            full_name: 'owner1/repo1',
            html_url: 'https://github.com/owner1/repo1',
            description: 'First repo',
            language: 'JavaScript',
            created_at: '2024-12-15T10:30:00Z',
          }),
        })
        // Mock second GitHub API response
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 456,
            full_name: 'owner2/repo2',
            html_url: 'https://github.com/owner2/repo2',
            description: 'Second repo',
            language: 'Python',
            created_at: '2024-12-14T10:30:00Z',
          }),
        });

      const result = await _fetch();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        nameWithOwner: 'owner1/repo1',
        stargazerCount: 150, // From ClickHouse API
        primaryLanguage: 'JavaScript', // From GitHub API
      });

      expect(result[1]).toMatchObject({
        nameWithOwner: 'owner2/repo2',
        stargazerCount: 200, // From ClickHouse API
        primaryLanguage: 'Python', // From GitHub API
      });
    });

    it('should skip no longer exist repos', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [
              { repo_name: 'owner1/repo1', stars: 150, appeared_at: '2024-12-15' },
              { repo_name: 'deleted/repo', stars: 100, appeared_at: '2024-12-14' },
            ],
          }),
        })
        // First GitHub API call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 123,
            full_name: 'owner1/repo1',
            html_url: 'https://github.com/owner1/repo1',
            description: 'First repo',
            language: 'JavaScript',
            created_at: '2024-12-15T10:30:00Z',
          }),
        })
        // Second GitHub API call returns 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await _fetch();

      expect(result).toHaveLength(1); // Only the first repo
      expect(result[0]!.nameWithOwner).toBe('owner1/repo1');
    });

    it('should skip no longer public repos', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'private/repo', stars: 150, appeared_at: '2024-12-15' }],
          }),
        })
        // GitHub API call returns 403 (private repo)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      const result = await _fetch();

      expect(result).toHaveLength(0); // Repo was skipped
    });

    it('should throw on malformed response', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Mock GitHub API response
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 123,
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
            created_at: null, // required, null not allowed
            description: null, // optional
            language: null, // optional
          }),
        });

      await expect(_fetch()).rejects.toThrow('expected string');
    });

    it('should throw on JSON parsing errors', async () => {
      // Mock ClickHouse response first
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Then mock GitHub API JSON parsing error
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockRejectedValue(new Error('invalid JSON')),
        });

      await expect(_fetch()).rejects.toThrow('invalid JSON');
    });

    it('should throw on network errors', async () => {
      // Mock ClickHouse response first
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Then mock GitHub API network error
        .mockRejectedValue(new Error('network error'));

      await expect(_fetch()).rejects.toThrow('network error');
    });

    it('should throw 5xx HTTP error', async () => {
      // Mock ClickHouse response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ repo_name: 'test/repo', stars: 100, appeared_at: '2024-12-15' }],
          }),
        })
        // Mock GitHub API error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      await expect(_fetch()).rejects.toThrowError(HttpError);
    });
  });
});
