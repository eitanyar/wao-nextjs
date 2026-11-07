#!/usr/bin/env node
// `npm run dev` pre-hook (paid-journey v2 M0.5, B17). Warns, never fails.
//
// The trap: @next/env loads .env.local but NEVER overrides a variable that is already
// set in the shell. Old shells export QWEN_BASE_URL / QWEN_API_KEY pointing at the
// retired dashscope-intl endpoint, so `next dev` silently uses them instead of the
// token-plan values in .env.local and every Qwen call fails (401) or goes to the
// wrong host. Production is unaffected (it reads .env.production on the server).
//
// npm runs this hook with the shell environment only (.env.local is not loaded yet),
// so any QWEN_* seen here came from the shell and WILL shadow .env.local.
// Fix for the current shell:   unset QWEN_BASE_URL QWEN_API_KEY QWEN_CHAT_MODEL
// Or launch with:              env -u QWEN_BASE_URL -u QWEN_API_KEY -u QWEN_CHAT_MODEL npm run dev

const shadowing = Object.keys(process.env).filter(key => key.startsWith('QWEN_')).sort();

if (shadowing.length) {
  const bar = '!'.repeat(78);
  console.warn([
    bar,
    `WARNING: shell exports ${shadowing.join(', ')}.`,
    'next dev will use these and IGNORE the values in .env.local (@next/env never overrides',
    'already-set variables). Stale shell values point at dashscope-intl and break every Qwen call.',
    `Fix: unset ${shadowing.join(' ')}   (or: env -u ${shadowing.join(' -u ')} npm run dev)`,
    bar,
  ].join('\n'));
}
