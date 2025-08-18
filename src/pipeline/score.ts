import { Repository, ScoredRepository } from '../utils/types';

export function score(repos: Repository[]): ScoredRepository[] {
  const topn = parseInt(process.env.NEWSLETTER_TOP_N || '10');

  // Simple logic for MVP
  return repos
    .slice(0, topn)
    .map(repo => ({
      ...repo,
      score: repo.stargazerCount,
    }))
    .sort((a, b) => b.score - a.score);
}
