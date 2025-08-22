import { Repository, RepositorySchema } from '../types/repository';
import { mockRepos } from '../mocks/repos';
import { TaggedError, HttpError, logInfo } from '../utils/logging';

export interface ClickHouseRepo {
  repo_name: string;
  stars: string;
  appeared_at: string;
}

const buildClickHouseQuery = (days: number, limit: number) => `
WITH
    now() AS t_now,
    t_now - INTERVAL ${days} DAY AS cutoff,
    ${limit} AS LIMIT_N
SELECT
    repo_name,
    countIf(event_type = 'WatchEvent') AS stars,
    greatest(
        maxIf(created_at, event_type = 'PublicEvent'), /* repo made public, was private */
        maxIf(created_at, event_type = 'CreateEvent' AND ref_type = 'repository')
    ) AS appeared_at
FROM github_events
WHERE created_at >= cutoff
GROUP BY repo_name
HAVING appeared_at >= cutoff
ORDER BY stars DESC, appeared_at DESC
LIMIT LIMIT_N
FORMAT JSON
`;

// TODO: backoff on 429/secondary rate limits; read X-RateLimit-Remaining headers.
export async function _fetch(): Promise<Repository[]> {
  if (process.env.NODE_ENV !== 'production') {
    return parseRepos(mockRepos);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new TaggedError('config', 'GITHUB_TOKEN var required');
  }

  const fetchDays = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  const topN = parseInt(process.env.NEWSLETTER_TOP_N || '10');
  const fetchLimit = topN * 3; // account for filtering

  const trendingRepos = await fetchTrendingRepos(fetchDays, fetchLimit);
  logInfo('clickhouse', `fetched ${trendingRepos.length} repos`);

  return await enrichRepos(trendingRepos, token);
}

async function fetchTrendingRepos(days: number, limit: number): Promise<ClickHouseRepo[]> {
  const query = buildClickHouseQuery(days, limit);

  const response = await fetch('https://play.clickhouse.com/?user=play', {
    method: 'POST',
    body: query,
  });

  if (!response.ok) {
    throw new HttpError('clickhouse', 'fetching trending repos failed', response);
  }

  const data = await response.json();
  return data.data as ClickHouseRepo[];
}

async function enrichRepos(repos: ClickHouseRepo[], token: string): Promise<Repository[]> {
  const result: Repository[] = [];

  for (const repo of repos) {
    const repoName = repo.repo_name;
    const response = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    // Some could've been deleted or went private
    if ([403, 404].includes(response.status)) {
      continue;
    }

    if (!response.ok) {
      throw new HttpError('github', 'fetching repo failed', response);
    }

    const details = await response.json();

    const repository: Repository = RepositorySchema.parse({
      id: details.id.toString(),
      nameWithOwner: details.full_name,
      url: details.html_url,
      description: details.description,
      primaryLanguage: details.language,
      createdAt: details.created_at,
      stargazerCount: details.stargazers_count,
    });

    result.push(repository);
  }

  return result;
}

function parseRepos(rawRepos: unknown[]): Repository[] {
  return rawRepos.map(repo => {
    return RepositorySchema.parse(repo);
  });
}
