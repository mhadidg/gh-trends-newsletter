import { Repository, RepositorySchema } from '../types/repository';
import { mockRepos } from '../mocks/repos';
import { logInfo } from '../utils/logging';
import { GitHubClient } from '../clients/github';
import { ClickHouseClient } from '../clients/clickhouse';

export async function scan(): Promise<Repository[]> {
  if (process.env.USE_MOCK_REPOS !== 'false') {
    logInfo('scan', 'using mock repos');
    return parseRepos(mockRepos);
  }

  // Create object early to validate env vars
  const clickhouse = new ClickHouseClient();
  const github = new GitHubClient(process.env.GITHUB_TOKEN);

  const dayAgo = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  const topN = parseInt(process.env.NEWSLETTER_TOP_N || '10');
  const limit = topN * 3; // account for filtering

  const trendingRepos = await clickhouse.getTrendingRepos(dayAgo, limit);
  logInfo('clickhouse', `fetched ${trendingRepos.length} repos`);

  const result: Repository[] = [];

  for (const repo of trendingRepos) {
    const repoName = repo.repo_name;
    const details = await github.getRepository(repoName);

    // Either been deleted or went private
    if (details === null) {
      continue;
    }

    result.push(
      RepositorySchema.parse({
        id: details.id.toString(),
        nameWithOwner: details.full_name,
        url: details.html_url,
        description: details.description,
        primaryLanguage: details.language,
        createdAt: details.created_at,
        stargazerCount: details.stargazers_count,
      })
    );
  }

  return result;
}

function parseRepos(rawRepos: unknown[]): Repository[] {
  return rawRepos.map(repo => {
    return RepositorySchema.parse(repo);
  });
}
