#!/usr/bin/env node

import 'dotenv-flow/config';
import { _fetch } from './pipeline/fetch.js';
import { score } from './pipeline/score.js';
import { render } from './pipeline/render';
import { getWeekNumber } from './utils/common';

async function preview(): Promise<void> {
  try {
    const repos = await _fetch();
    const scoredRepos = score(repos);
    const newsletter = render(scoredRepos);

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    const weekId = `${year}-W${week.toString().padStart(2, '0')}`;

    console.log(`📅 Week: ${weekId}`);
    console.log(`📦 Repositories: ${scoredRepos.length}`);
    console.log(`📝 Subject: ${newsletter.subject}`);
    console.log('');

    console.log('📧 EMAIL CONTENT:');
    console.log('─'.repeat(50));
    console.log(newsletter.content);
  } catch (error) {
    console.error('❌ Preview failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  preview().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
