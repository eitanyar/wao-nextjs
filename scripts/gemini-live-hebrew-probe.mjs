#!/usr/bin/env node
/**
 * Gemini Live API Hebrew role-play quality probe — M1 bake-off script.
 * Spec: docs/specs/articulation-trainer.md §3, §7 (M1: "parallel Gemini Live
 * Hebrew probe script. Decide the engine.")
 *
 * NOT production code — a standalone quality check, no UI, no session
 * management, no retries. Uses the same "Danny the skeptical plumber"
 * persona as the ElevenLabs path (src/lib/trainer/persona.ts) so the two
 * engines are directly comparable. The persona text is duplicated here
 * (not imported) because this is a plain .mjs script and the source lives
 * in a TypeScript module under src/ — see src/lib/trainer/persona.ts for
 * the single source of truth if you need to edit the persona; keep this
 * copy in sync manually for the duration of the M1 probe only.
 *
 * Usage:
 *   node scripts/gemini-live-hebrew-probe.mjs --in path/to/input.wav [--out path/to/output.wav]
 *
 * Input WAV must be 16-bit PCM, mono, ideally 16kHz (per Gemini Live's
 * documented input format). Output WAV is written as 16-bit PCM mono 24kHz
 * (Gemini Live's documented output format). The full text transcript
 * (input + output) is printed to stdout.
 *
 * Requires GEMINI_API_KEY in the environment (NOT committed — add it to
 * .env.local and export it into your shell, or run:
 *   GEMINI_API_KEY=xxx node scripts/gemini-live-hebrew-probe.mjs --in ...
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';

const DANNY_SYSTEM_PROMPT = `אתה משחק תפקיד של דני, בן 52, אינסטלטור עצמאי מחולון. אתה עסוק תמיד,
מדבר ישיר וקצת גס, ובלי זמן לזיבולים. עברית מדוברת, ישראלית, לא ספרותית — משפטים
קצרים, לפעמים חצי משפט שנקטע. אתה לא שחקן, אתה לא "AI", אתה פשוט דני — תישאר
בתפקיד לאורך כל השיחה ותענה רק כדני.

הרקע שלך: לפני כשנה שכרת פרילנסר לניהול קמפיין גוגל אדס. הוא לקח ממך אלפי
שקלים, לא הביא כמעט לידים, ולא ענה לטלפונים כשרצית הסברים. מאז אתה חשדן כלפי
כל מי שמתקשר ומציע "לשווק אותך" או "להביא לך יותר עבודות". אתה לא שונא שיווק —
פשוט נכווית ולא סומך בקלות.

איך אתה נפתח: אתה עונה לטלפון בקוצר רוח, כאילו אתה באמצע עבודה — בלי "הלו נעים
מאוד", ישר "כן, מי זה". אם מי שמדבר איתך פותח במכירה — אתה נהיה מתגונן, קוצר,
מנסה לסיים את השיחה מהר.

המטרה הנסתרת שלך: אתה מתרכך רק אם מי שמדבר איתך שואל אותך שאלה אמיתית על העסק
שלך ומשקף בחזרה את החשש שלך, לפני שהוא מנסה למכור לך משהו.`;

const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';

function parseArgs(argv) {
  const args = { in: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--in') args.in = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

/** Minimal WAV reader — assumes canonical PCM WAV (fmt chunk before data chunk). */
function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not a RIFF/WAVE file`);
  }

  let offset = 12;
  let fmt = null;
  let data = null;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(chunkStart),
        numChannels: buf.readUInt16LE(chunkStart + 2),
        sampleRate: buf.readUInt32LE(chunkStart + 4),
        bitsPerSample: buf.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === 'data') {
      data = buf.subarray(chunkStart, chunkStart + chunkSize);
    }

    offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (!fmt || !data) throw new Error(`${filePath}: missing fmt or data chunk`);
  return { ...fmt, data };
}

/** Minimal WAV writer for 16-bit PCM mono. */
function writeWav(filePath, pcmData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmData.length, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      '\n[gemini-live-hebrew-probe] GEMINI_API_KEY is not set.\n' +
        'Eitan: add GEMINI_API_KEY to .env.local (it is currently commented out there)\n' +
        'and export it into this shell before running the probe, e.g.:\n' +
        '  GEMINI_API_KEY=your-key node scripts/gemini-live-hebrew-probe.mjs --in sample.wav\n',
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.in) {
    console.error(
      'Usage: node scripts/gemini-live-hebrew-probe.mjs --in path/to/input.wav [--out path/to/output.wav]\n' +
        'Input WAV should be 16-bit PCM mono, ideally 16kHz.',
    );
    process.exit(1);
  }

  const inPath = path.resolve(args.in);
  const outPath = path.resolve(args.out || path.join(path.dirname(inPath), 'gemini-live-probe-out.wav'));

  console.log(`[gemini-live-hebrew-probe] reading ${inPath}`);
  const wav = readWav(inPath);
  if (wav.sampleRate !== 16000 || wav.bitsPerSample !== 16 || wav.numChannels !== 1) {
    console.warn(
      `[gemini-live-hebrew-probe] WARNING: input is ${wav.sampleRate}Hz / ${wav.bitsPerSample}-bit / ` +
        `${wav.numChannels}ch — Gemini Live documents 16kHz 16-bit mono PCM input. Sending as-is; ` +
        'quality/behavior may degrade if the format does not match.',
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const outputChunks = [];
  let inputTranscript = '';
  let outputTranscript = '';
  let turnComplete = false;

  console.log(`[gemini-live-hebrew-probe] connecting to model ${GEMINI_LIVE_MODEL}...`);

  const session = await ai.live.connect({
    model: GEMINI_LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: DANNY_SYSTEM_PROMPT,
      speechConfig: { languageCode: 'he-IL' },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => console.log('[gemini-live-hebrew-probe] connection open'),
      onmessage: message => {
        const content = message.serverContent;
        if (!content) return;

        if (content.inputTranscription?.text) {
          inputTranscript += content.inputTranscription.text;
        }
        if (content.outputTranscription?.text) {
          outputTranscript += content.outputTranscription.text;
        }

        const parts = content.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            outputChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
        }

        if (content.turnComplete) {
          turnComplete = true;
        }
      },
      onerror: e => console.error('[gemini-live-hebrew-probe] error', e?.message ?? e),
      onclose: e => console.log('[gemini-live-hebrew-probe] connection closed', e?.reason ?? ''),
    },
  });

  console.log('[gemini-live-hebrew-probe] sending audio input...');
  session.sendRealtimeInput({
    audio: {
      data: wav.data.toString('base64'),
      mimeType: `audio/pcm;rate=${wav.sampleRate}`,
    },
  });
  session.sendRealtimeInput({ audioStreamEnd: true });

  const start = Date.now();
  const timeoutMs = 30000;
  while (!turnComplete && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 250));
  }

  if (!turnComplete) {
    console.warn('[gemini-live-hebrew-probe] WARNING: timed out waiting for turnComplete after 30s');
  }

  session.close();

  console.log('\n--- Transcript ---');
  console.log(`[user, ASR]:  ${inputTranscript || '(empty — check input audio format)'}`);
  console.log(`[danny]:      ${outputTranscript || '(empty — no reply received)'}`);
  console.log('------------------\n');

  if (outputChunks.length > 0) {
    const pcm = Buffer.concat(outputChunks);
    writeWav(outPath, pcm, 24000); // Gemini Live outputs 24kHz 16-bit PCM
    console.log(`[gemini-live-hebrew-probe] wrote reply audio to ${outPath}`);
  } else {
    console.log('[gemini-live-hebrew-probe] no audio output received.');
  }
}

main().catch(err => {
  console.error('[gemini-live-hebrew-probe] fatal error:', err);
  process.exit(1);
});
