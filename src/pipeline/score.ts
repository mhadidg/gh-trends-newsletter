import { franc } from 'franc';
import { Repository, ScoredRepository } from '../utils/types';

export function score(repos: Repository[]): ScoredRepository[] {
  const topn = parseInt(process.env.NEWSLETTER_TOP_N || '10');

  // Simple logic for MVP
  return repos
    .filter(repo => {
      // high-quality repo with no desc? I'd rather take the risks
      if (repo.description === null || repo.description.trim() === '') {
        console.warn(`[INFO] Skipping repo ${repo.nameWithOwner} - empty desc`);
        return false;
      }

      const lang = franc(repo.description);
      // no Chinese with ❤️
      if (lang === 'cmn') {
        console.warn(`[INFO] Skipping repo - lang: ${lang}, desc: ${repo.description}`);
        return false;
      }

      return true;
    })
    .map(repo => ({
      ...repo,
      score: repo.stargazerCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topn);
}
