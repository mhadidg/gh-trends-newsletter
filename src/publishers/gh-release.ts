import { HttpError, TaggedError } from '../utils/logging';
import { getWeekNumber } from '../utils/common';
import { Publisher } from '../types/publisher';

export const SERVICE_URL = 'https://api.github.com/repos';

export class GitHubReleasePublisher extends Publisher {
  readonly name = 'github-releases';

  enabled(): boolean {
    return process.env.GITHUB_RELEASES_ENABLED === 'true';
  }

  async publish(content: string): Promise<string> {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_RELEASES_REPO;

    if (!token) {
      throw new TaggedError('config', 'GITHUB_TOKEN required when GITHUB_RELEASES_ENABLED=true');
    }

    if (!repo) {
      throw new TaggedError(
        'config',
        'GITHUB_RELEASES_REPO required when GITHUB_RELEASES_ENABLED=true'
      );
    }

    const response = await fetch(`${SERVICE_URL}/${repo}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        tag_name: this.releaseTag(),
        name: this.subject(),
        body: content,
        draft: false,
        prerelease: false,
      }),
    });

    if (!response.ok) {
      throw new HttpError('github', 'release creation failed', response);
    }

    const json = await response.json();
    if (!json.id) {
      throw new TaggedError('github', 'release creation returned no ID', { response: json });
    }

    return json.id.toString();
  }

  private releaseTag(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `release-${year}-W${week.toString().padStart(2, '0')}`;
  }
}
