import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { send } from '../../src/pipeline/send';
import { HttpError } from '../../src/utils/logging';

describe('send.ts', () => {
  const mockFetch = vi.fn();

  const newsletter = {
    subject: 'GitHub Trends — 2025-W33',
    content: 'Hello world',
  };

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    vi.clearAllMocks(); // Reset mocks
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe('Dry-run mode', () => {
    it('should return mock data when SEND_ENABLED is false', async () => {
      vi.stubEnv('SEND_ENABLED', 'false');

      const result = await send(newsletter);

      expect(result).toMatch('mock-disabled');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return mock data when SEND_ENABLED is undefined', async () => {
      vi.stubEnv('SEND_ENABLED', undefined);

      const result = await send(newsletter);

      expect(result).toMatch('mock-disabled');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Config validation', () => {
    beforeEach(() => {
      vi.stubEnv('SEND_ENABLED', 'true');
    });

    it('should throw when BUTTONDOWN_API_KEY is missing', async () => {
      vi.stubEnv('BUTTONDOWN_API_KEY', undefined);

      await expect(send(newsletter)).rejects.toThrow('BUTTONDOWN_API_KEY');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw when BUTTONDOWN_API_KEY is empty', async () => {
      vi.stubEnv('BUTTONDOWN_API_KEY', '');

      await expect(send(newsletter)).rejects.toThrow('BUTTONDOWN_API_KEY');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Live mode', () => {
    beforeEach(() => {
      vi.stubEnv('SEND_ENABLED', 'true');
      vi.stubEnv('BUTTONDOWN_API_KEY', 'bd_live_key_123');
    });

    it('should make well-formed request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'bd_123' }),
      });

      const result = await send(newsletter);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.buttondown.email/v1/emails',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
          headers: expect.objectContaining({
            Authorization: 'Token bd_live_key_123',
            'Content-Type': 'application/json',
          }),
        })
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const parsedBody = JSON.parse(options.body as string);
      expect(parsedBody).toEqual({
        subject: 'GitHub Trends — 2025-W33',
        body: 'Hello world',
        email_type: 'public',
      });

      expect(result).toBe('bd_123');
    });

    it('should not fail on empty response', async () => {
      // Totally unexpected, but we assume the call succeeded on 200 OK
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}), // no id
      });

      const result = await send(newsletter);

      expect(result).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      vi.stubEnv('SEND_ENABLED', 'true');
      vi.stubEnv('BUTTONDOWN_API_KEY', 'bd_live_key_123');
    });

    it('should handle 5xx HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('internal server error'),
      });

      await expect(send(newsletter)).rejects.toThrowError(HttpError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));

      await expect(send(newsletter)).rejects.toThrow('network down');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('invalid JSON')),
      });

      await expect(send(newsletter)).rejects.toThrow('invalid JSON');
    });
  });
});
