import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _fetch } from '../../src/pipeline/fetch';
import { mockGithubRepos } from '../../src/mocks/github-api';

describe('fetch.ts', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks(); // Reset mocks
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe('Mock environment', () => {
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

  describe('GitHub API auth', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should throw error when GITHUB_TOKEN is missing', async () => {
      vi.stubEnv('GITHUB_TOKEN', undefined);

      await expect(_fetch()).rejects.toThrow(
        '[FATAL] config: GITHUB_TOKEN environment variable required'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when GITHUB_TOKEN is empty', async () => {
      vi.stubEnv('GITHUB_TOKEN', '');

      await expect(_fetch()).rejects.toThrow(
        '[FATAL] config: GITHUB_TOKEN environment variable required'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should make authenticated request with token', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'ghp_valid_token_123');

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            search: {
              nodes: mockGithubRepos,
            },
          },
        }),
      });

      await _fetch();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_valid_token_123',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Data parsing & validation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('GITHUB_TOKEN', 'ghp_valid_token_123');
    });

    it('should successfully parse valid repo data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            search: {
              nodes: [mockGithubRepos[0]],
            },
          },
        }),
      });

      const result = await _fetch();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGithubRepos[0]);
    });

    it('should handle repos with missing optional', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            search: {
              nodes: [
                {
                  id: 'test-id',
                  nameWithOwner: 'test/repo',
                  url: 'https://github.com/test/repo',
                  createdAt: '2024-12-15T10:30:00Z',
                  stargazerCount: 100,
                  description: null, // No description
                  primaryLanguage: null, // No primary language
                },
              ],
            },
          },
        }),
      });

      const result = await _fetch();

      expect(result).toHaveLength(1);
      expect(result[0]!.primaryLanguage).toBeNull();
      expect(result[0]!.description).toBeNull();
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            search: {
              nodes: [],
            },
          },
        }),
      });

      const result = await _fetch();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should validate repo schema and throw on invalid data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            search: {
              nodes: [
                {
                  id: 'test-id',
                  nameWithOwner: 'test/repo',
                  // Missing required fields
                },
              ],
            },
          },
        }),
      });

      await expect(_fetch()).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('GITHUB_TOKEN', 'ghp_valid_token_123');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({}),
      });

      await expect(_fetch()).rejects.toThrow('[ERROR] github-api: request failed');
    });

    it('should handle GraphQL errors in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          errors: [{ message: 'Field error' }, { message: 'Another error' }],
        }),
      });

      await expect(_fetch()).rejects.toThrow('[ERROR] graphql: validation errors detected');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(_fetch()).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(_fetch()).rejects.toThrow('Invalid JSON');
    });
  });
});
