#!/usr/bin/env node

import 'dotenv/config';
import { _fetch } from './pipeline/fetch.js';
import { score } from './pipeline/score.js';
import { render } from './pipeline/render';
import { send } from './pipeline/send.js';

async function main(): Promise<void> {
  try {
    console.log('📡 Scanning the GitHub universe...');
    const repos = await _fetch();
    console.log(`   → ${repos.length} trending repositories discovered`);
    console.log('');

    console.log('🏆 Ranking by popularity...');
    const scoredRepos = score(repos);
    console.log(`   → Top candidates selected`);
    console.log('');

    console.log('✍️ Crafting newsletter content...');
    const newsletter = render(scoredRepos);
    console.log(`   → "${newsletter.subject}" (${newsletter.content.length} chars)`);
    console.log('');

    const sendEnabled = process.env.SEND_ENABLED === 'true';
    console.log(`📮 Publishing status: ${sendEnabled ? 'LIVE' : 'DRY RUN'}`);

    const sendResult = await send(newsletter);
    if (sendResult.success) {
      console.log(`   → Email delivered (ID: ${sendResult.messageId})`);
    } else {
      console.log(`   → ❌ Send failed: ${sendResult.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`  → ❌ Pipeline failed:`, error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('🫣 Unhandled error:', error);
    process.exit(1);
  });
}
