#!/usr/bin/env node

import 'dotenv-flow/config';
import { _fetch } from './pipeline/fetch.js';
import { score } from './pipeline/score.js';
import { render } from './pipeline/render';
import { send } from './pipeline/send.js';
import { TaggedError, HttpError, logError, logHttpError, logInfo } from './utils/logging';

export async function main(): Promise<void> {
  const window = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  const topn = parseInt(process.env.NEWSLETTER_TOP_N || '10');

  console.log(`📡 Scanning the GitHub universe (window: ${window}, top-n: ${topn})`);
  const repos = await _fetch();
  logInfo('scan', `${repos.length} trending repos discovered`);
  console.log('');

  console.log('🏆 Scoring to select the best');
  const scoredRepos = score(repos);
  logInfo('score', `${scoredRepos.length} repos selected`);
  console.log('');

  console.log('✍️ Crafting newsletter content...');
  const newsletter = render(scoredRepos);
  logInfo('render', `rendered newsletter (subject: ${newsletter.subject})`);
  console.log('');

  const sendEnabled = process.env.SEND_ENABLED === 'true';
  console.log(`📮 Publishing status: ${sendEnabled ? 'LIVE' : 'DRY RUN'}`);

  const messageId = await send(newsletter);
  logInfo('send', `email sent (ID: ${messageId})`);
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async error => {
    if (error instanceof HttpError) {
      await logHttpError(error.tag, error);
    } else if (error instanceof TaggedError) {
      logError(error.tag, error);
    } else {
      console.log('');
      console.log('🫣 Unhandled error');
      throw error;
    }

    process.exit(1);
  });
}
