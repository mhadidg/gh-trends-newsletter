import { Repository, RepositorySchema } from '../utils/types';
import { mockGithubRepos } from '../mocks/github-api';

const buildTopReposQuery = (since: string) => `
  query TrendingRepos {
    search(
      query: "created:>${since} fork:false archived:false sort:stars"
      type: REPOSITORY
      first: 100
    ) {
      nodes {
        ... on Repository {
          id
          nameWithOwner
          url
          description
          primaryLanguage {
            name
          }
          createdAt
          stargazerCount
        }
      }
    }
  }
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

  const since = new Date();
  const fetchDays = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  since.setDate(since.getDate() - fetchDays);
  const sinceFormatted = since.toISOString().split('T')[0]!; // Format as YYYY-MM-DD
  console.log(`[INFO] fetch: fetching repos since ${sinceFormatted}`);

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: buildTopReposQuery(sinceFormatted),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data.message?.toLowerCase() ?? 'unknown';
      throw new Error(
        `[ERROR] github-api: request failed (status=${response.status}, message=${message})`
      );
    }

    if (data.errors) {
      throw new Error(`[ERROR] graphql: validation errors detected (count=${data.errors.length})`);
    }

    return parseRepos(data.data.search.nodes);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`[FATAL] fetch: operation failed (reason=${reason})`);
    throw error;
  }
}

function mockRepos(): Repository[] {
  return parseRepos(mockGithubRepos);
}

function parseRepos(rawRepos: unknown[]): Repository[] {
  return rawRepos.map(repo => {
    return RepositorySchema.parse(repo);
  });
}
