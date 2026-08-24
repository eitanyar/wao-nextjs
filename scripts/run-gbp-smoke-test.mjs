#!/usr/bin/env node
/**
 * Run the GBP scope smoke test against credentials in .env.local
 */
import { runGbpScopeSmokeTest } from '../src/lib/gbp/client.ts';

const result = await runGbpScopeSmokeTest();

console.log('\n📋 GBP Smoke Test Results:\n');
console.log(JSON.stringify(result, null, 2));

if (result.results['accounts.list'] === 'pass') {
  console.log('\n✅ Credentials are working!\n');
  process.exit(0);
} else {
  console.log('\n❌ Credentials test failed — check the notes above.\n');
  process.exit(1);
}
