import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScoredRepository } from '../../src/types/repository';
import { publishAll } from '../../src/pipeline/publish';
import { mockGithubRepos } from '../../src/mocks/github-api';

const publisher01 = {
  name: 'publisher-01',
  enabled: vi.fn().mockReturnValue(false),
  publish: vi.fn(),
  subject: vi.fn().mockReturnValue('subject'),
};

const publisher02 = {
  name: 'publisher-02',
  enabled: vi.fn().mockReturnValue(false),
  publish: vi.fn(),
  subject: vi.fn().mockReturnValue('subject'),
};

const pubs = [publisher01, publisher02];

vi.mock('../../src/pipeline/render', () => ({
  render: vi.fn().mockReturnValue('content'),
}));

describe('publish.ts', () => {
  const repos: ScoredRepository[] = [
    {
      ...mockGithubRepos[0]!,
      score: 0,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should handle zero publisher enabled', async () => {
    const result = await publishAll(repos, pubs);

    expect(result).toEqual([]);
    expect(publisher01.publish).not.toHaveBeenCalled();
    expect(publisher02.publish).not.toHaveBeenCalled();
  });

  it('should call only the enabled publishers', async () => {
    publisher01.enabled.mockReturnValue(true);
    publisher01.publish.mockResolvedValueOnce('bd_123');

    const result = await publishAll(repos, pubs);

    expect(result).toEqual(['bd_123']);
    expect(publisher01.publish).toHaveBeenCalledWith('content');
    expect(publisher02.publish).not.toHaveBeenCalled();
  });

  it('should call multiple publishers when enabled', async () => {
    publisher01.enabled.mockReturnValue(true);
    publisher02.enabled.mockReturnValue(true);
    publisher01.publish.mockResolvedValueOnce('bd_123');
    publisher02.publish.mockResolvedValueOnce('gh_456');

    const result = await publishAll(repos, pubs);

    expect(result).toEqual(['bd_123', 'gh_456']);
  });

  it('should throw when one of the publisher fails', async () => {
    publisher01.enabled.mockReturnValue(true);
    publisher02.enabled.mockReturnValue(true);

    publisher01.publish.mockRejectedValueOnce(new Error('publisher-01'));
    publisher02.publish.mockResolvedValueOnce('gh_456');

    await expect(publishAll(repos, pubs)).rejects.toThrow('publisher-01');
  });

  it('should throw when multiple publishers fail (first error wins)', async () => {
    publisher01.enabled.mockReturnValue(true);
    publisher02.enabled.mockReturnValue(true);

    publisher01.publish.mockRejectedValueOnce(new Error('publisher-01'));
    publisher02.publish.mockRejectedValueOnce(new Error('publisher-02'));

    await expect(publishAll(repos, pubs)).rejects.toThrow('publisher-01');
  });
});
