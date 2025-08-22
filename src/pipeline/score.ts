import { franc } from 'franc';
import { Repository, ScoredRepository } from '../types/repository';
import { logWarn } from '../utils/logging';
import { hoursSince } from '../utils/common';

export function score(repos: Repository[]): ScoredRepository[] {
  const topn = parseInt(process.env.NEWSLETTER_TOP_N || '10');

  // Simple logic for MVP
  return repos
    .filter(repo => {
      const repoName = repo.nameWithOwner;
      // high-quality repo with no desc? Happy to take the risks
      if (repo.description === null || repo.description.trim() === '') {
        logWarn('score', `empty description, skipping: ${repoName}`);
        return false;
      }

      const lang = franc(repo.description);
      // no Chinese with love
      if (lang === 'cmn') {
        logWarn('score', `Chinese repo, skipping: ${repoName}`);
        return false;
      }

      return true;
    })
    .map(repo => ({ ...repo, score: repo.stargazerCount / hoursSince(repo.createdAt) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topn);
}
