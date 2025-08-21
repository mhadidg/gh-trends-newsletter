#!/usr/bin/env node

import 'dotenv-flow/config';
import { _fetch } from './pipeline/fetch.js';
import { score } from './pipeline/score.js';
import { render } from './pipeline/render';
import { send } from './pipeline/send.js';
import { logInfo } from './utils/logging';
import { handleProcessError } from './utils/common';

export async function run(): Promise<void> {
  await main().catch(handleProcessError);
}

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
  await run();
}
