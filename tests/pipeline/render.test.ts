import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../src/pipeline/render';
import { ScoredRepository } from '../../src/utils/types';
import { mockRepos } from '../../src/mocks/github-api';

describe('render.ts', () => {
  const mockDate = new Date('2025-08-15T10:00:00.000Z'); // Friday, Week 33

  // Convert Repository to ScoredRepository
  const mockScoredRepos: ScoredRepository[] = mockRepos.map((repo, index) => ({
    ...repo,
    score: 0.9 - index * 0.1, // Descending scores from 0.9 to 0.0
  }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic rendering', () => {
    it('should handle empty repos array', () => {
      const result = render([]);

      expect(result.content).toContain('GitHub took a vacation this week!');
    });

    it('should render newsletter with single repo', () => {
      const result = render([mockScoredRepos[0]!]);

      expect(result.content).toContain('example/awesome-project');
    });

    it('should render newsletter with multiple repos', () => {
      const result = render([mockScoredRepos[0]!, mockScoredRepos[1]!]);

      expect(result.content).toContain('example/awesome-project');
      expect(result.content).toContain('dev/cool-tool');
    });
  });

  describe('Subject line', () => {
    it('should include the year', () => {
      const result = render([mockScoredRepos[0]!]);

      expect(result.subject).toContain('2025');
    });

    it('should include the week number', () => {
      vi.setSystemTime(new Date('2024-12-30T10:00:00.000Z'));

      const result = render([mockScoredRepos[0]!]);

      expect(result.subject).toContain('W53');
    });

    it('should pad week number with leading zero', () => {
      vi.setSystemTime(new Date('2025-01-01T10:00:00.000Z')); // Week 2

      const result = render([mockScoredRepos[0]!]);

      expect(result.subject).toContain('W01');
    });
  });

  describe('Email content', () => {
    it('should include key information', () => {
      const result = render([mockScoredRepos[0]!]);

      expect(result.content).toContain('example/awesome-project');
      expect(result.content).toContain('An awesome new project that does amazing things');
      expect(result.content).toContain('https://github.com/example/awesome-project');
      expect(result.content).toContain('1,250');
    });

    it('should handle repos with null values', () => {
      const result = render([
        {
          ...mockScoredRepos[0]!,
          description: null,
          primaryLanguage: null,
        },
      ]);

      expect(result.content).toContain('(no description available)');
    });

    it('should handle special chars in descriptions', () => {
      const specialCharRepo: ScoredRepository = {
        ...mockScoredRepos[0]!,
        description: 'Tool with "quotes" and <tags> & special chars',
      };

      const result = render([specialCharRepo]);

      expect(result.content).toBeTruthy(); // Should not break template rendering
    });

    it('should handle unicode chars in descriptions', () => {
      const unicodeRepo: ScoredRepository = {
        ...mockScoredRepos[0]!,
        description: 'A project with emojis 🚀 and unicode chars 你好',
      };

      const result = render([unicodeRepo]);

      expect(result.content).toContain('🚀');
      expect(result.content).toContain('你好');
    });
  });
});
