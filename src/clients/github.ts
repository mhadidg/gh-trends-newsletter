import { HttpError, logWarn, TaggedError } from '../utils/logging';

export interface GitHubRepoResponse {
  id: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  created_at: string;
  stargazers_count: number;
}

export interface GithubReleasePayload {
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
}

export class GitHubClient {
  public static readonly baseUrl = 'https://api.github.com';
  private readonly token: string;

  constructor(token?: string) {
    if (!token) {
      throw new TaggedError('config', 'GITHUB_TOKEN required');
    }

    this.token = token;
  }

  async getRepository(repo: string): Promise<GitHubRepoResponse | null> {
    const response = await fetch(`${GitHubClient.baseUrl}/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if ([403, 404].includes(response.status)) {
      logWarn('github', `repo ${repo} not found or access denied (${response.status})`);
      return null;
    }

    if (!response.ok) {
      throw new HttpError('github', 'fetching repo failed', response);
    }

    return response.json();
  }

  async createRelease(repo: string, release: GithubReleasePayload): Promise<{ id: string }> {
    const response = await fetch(`${GitHubClient.baseUrl}/repos/${repo}/releases`, {
      method: 'POST',
      body: JSON.stringify(release),
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new HttpError('github', 'release creation failed', response);
    }

    const json = await response.json();
    if (!json.id) {
      throw new TaggedError('github', 'release creation returned no ID', { response: json });
    }

    return { id: json.id.toString() };
  }
}
