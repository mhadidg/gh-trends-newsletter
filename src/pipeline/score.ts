import { Repository, ScoredRepository } from '../utils/types';

export function score(repos: Repository[]): ScoredRepository[] {
  // Simple logic for MVP
  return repos
    .slice(0, 10)
    .map(repo => ({
      ...repo,
      score: repo.stargazerCount,
    }))
    .sort((a, b) => b.score - a.score);
}
