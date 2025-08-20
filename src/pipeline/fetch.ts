import { Repository, RepositorySchema } from '../utils/types';
import { mockGithubRepos } from '../mocks/github-api';

export interface ClickHouseRepo {
  repo_name: string;
  stars: number;
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
  // Use mocks in dev/test environments
  if (process.env.NODE_ENV !== 'production') {
    return mockRepos();
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('[FATAL] config: GITHUB_TOKEN environment variable required');
  }

  const fetchDays = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  const topN = parseInt(process.env.NEWSLETTER_TOP_N || '10');
  const fetchLimit = topN * 3; // account for filtering

  console.log(`[INFO] fetch: fetching top ${fetchLimit} repos from last ${fetchDays} days`);

  try {
    const clickhouseRepos = await fetchTrendingRepos(fetchDays, fetchLimit);
    console.log(`[INFO] fetch: got ${clickhouseRepos.length} repos from ClickHouse`);

    const repositories = await fetchRepoDetails(clickhouseRepos, token);
    console.log(`[INFO] fetch: enriched repos with GitHub data`);

    return repositories;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`[FATAL] fetch: ${reason}`);
    throw error;
  }
}

async function fetchTrendingRepos(days: number, limit: number): Promise<ClickHouseRepo[]> {
  const query = buildClickHouseQuery(days, limit);

  const response = await fetch('https://play.clickhouse.com/?user=play', {
    method: 'POST',
    body: query,
  });

  if (response.ok) {
    const message = await response.text();
    throw new Error(
      `clickhouse: request failed (status: ${response.status})\n  → Reason: ${message}`
    );
  }

  const data = await response.json();
  return data.data as ClickHouseRepo[];
}

async function fetchRepoDetails(repos: ClickHouseRepo[], token: string): Promise<Repository[]> {
  const result: Repository[] = [];

  for (const repo of repos) {
    const repoName = repo.repo_name;
    try {
      const response = await fetch(`https://api.github.com/repos/${repoName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `github: failed for ${repoName} (status: ${response.status})\n  → Response: ${body}`
        );
      }

      const details = await response.json();

      const repository: Repository = {
        id: details.id.toString(),
        nameWithOwner: details.full_name,
        url: details.html_url,
        description: details.description,
        primaryLanguage: details.language ? { name: details.language } : null,
        createdAt: details.created_at,
        stargazerCount: repo.stars,
      };

      result.push(repository);
    } catch (error) {
      // Presumably repo got deleted or made private
      const reason = error instanceof Error ? error.message : 'unknown';
      console.warn(`[WARN] fetch: failed to get details for ${repoName}, skipping`);
      console.warn(`  → Reason: ${reason}`);
    }
  }

  if (result.length === 0) {
    throw new Error('github: all requests failed');
  }

  return result;
}

function mockRepos(): Repository[] {
  return parseRepos(mockGithubRepos);
}

function parseRepos(rawRepos: unknown[]): Repository[] {
  return rawRepos.map(repo => {
    return RepositorySchema.parse(repo);
  });
}
