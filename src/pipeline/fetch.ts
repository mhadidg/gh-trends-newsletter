import { Repository, RepositorySchema } from '../utils/types';
import { mockGitHubResponse } from '../mocks/github-api';

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
    return parseMockResponse();
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('[FATAL] config: GITHUB_TOKEN environment variable required');
  }

  const since = new Date();
  // TODO: make the 7-day window configurable (env or CLI)
  since.setDate(since.getDate() - 7); // Last 7 days
  const sinceFormatted = since.toISOString().split('T')[0]!; // Format as YYYY-MM-DD

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
      const message = data.message.toLowerCase() ?? 'unknown';
      throw new Error(
        `[ERROR] github-api: request failed (status=${response.status}, message=${message})`
      );
    }

    if (data.errors) {
      throw new Error(`[ERROR] graphql: validation errors detected (count=${data.errors.length})`);
    }

    return parseRepositories(data.data.search.nodes);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`[FATAL] fetch: operation failed (reason=${reason})`);
    throw error;
  }
}

function parseMockResponse(): Repository[] {
  return parseRepositories(mockGitHubResponse.data.search.nodes);
}

function parseRepositories(rawRepos: unknown[]): Repository[] {
  return rawRepos.map(repo => {
    const parsed = RepositorySchema.parse(repo);
    return parsed;
  });
}
