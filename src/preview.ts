#!/usr/bin/env node

import 'dotenv-flow/config';
import { _fetch } from './pipeline/fetch.js';
import { score } from './pipeline/score.js';
import { render } from './pipeline/render';
import { HttpError, logError, logHttpError, logInfo, TaggedError } from './utils/logging';

async function preview() {
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
  console.log('─'.repeat(50));
  console.log(newsletter.content);
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  preview().catch(async error => {
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
