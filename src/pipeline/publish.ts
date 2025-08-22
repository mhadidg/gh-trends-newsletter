import { ScoredRepository } from '../types/repository';
import { ButtondownPublisher } from '../publishers/buttondown';
import { GitHubReleasePublisher } from '../publishers/gh-release';
import { logInfo } from '../utils/logging';
import { Publisher } from '../types/publisher';
import { render } from './render';

const publishers = [
  // Executes in order
  new ButtondownPublisher(),
  new GitHubReleasePublisher(),
];

export async function publishAll(
  repos: ScoredRepository[],
  // Don't use below argument in production code
  // Enables injecting custom publishers for testing
  pubs: Publisher[] = publishers
): Promise<string[]> {
  const content = render(repos);
  const enabledPubs = pubs.filter(pub => pub.enabled());

  if (enabledPubs.length === 0) {
    logInfo('publish', 'no publishers enabled, skipping publication');
    return [];
  }

  // Run all publishers in parallel
  // Promise.allSettled always resolve, even if some promises reject
  const results = await Promise.allSettled(
    enabledPubs.map(async pub => {
      logInfo('publish', `publishing via ${pub.name}`);
      const messageId = await pub.publish(content);
      logInfo('publish', `${pub.name} published successfully (ID: ${messageId})`);
      return messageId;
    })
  );

  const messageIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;

    if (result.status === 'fulfilled') {
      messageIds.push(result.value);
    } else {
      throw result.reason;
    }
  }

  return messageIds;
}
