#!/usr/bin/env node

import 'dotenv-flow/config';
import { _fetch } from './pipeline/fetch.js';
import { rank } from './pipeline/rank';
import { render } from './pipeline/render';
import { logInfo } from './utils/logging';
import { handleProcessError } from './utils/common';

async function preview() {
  const window = parseInt(process.env.FETCH_WINDOW_DAYS || '7');
  const topn = parseInt(process.env.NEWSLETTER_TOP_N || '10');

  console.log(`📡 Scanning the GitHub universe (window: ${window}, top-n: ${topn})`);
  const repos = await _fetch();
  logInfo('scan', `${repos.length} trending repos discovered`);
  console.log('');

  console.log('🏆 Scoring to select the best');
  const scoredRepos = rank(repos);
  logInfo('score', `${scoredRepos.length} repos selected`);
  console.log('');

  console.log('✍️ Crafting release content');
  const content = render(scoredRepos);
  logInfo('render', `rendered release`);
  console.log('');
  console.log('─'.repeat(50));
  console.log(content);
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  preview().catch(handleProcessError);
}
