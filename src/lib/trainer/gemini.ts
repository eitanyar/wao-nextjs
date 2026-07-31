/**
 * Server-only Gemini Live client helper for the Articulation & EQ Trainer.
 * Default engine per docs/specs/articulation-trainer.md §3 (bake-off resolved
 * 26.7.2026 — Hebrew quality approved). Never import from a client component —
 * it reads GEMINI_API_KEY from process.env.
 *
 * The browser never sees GEMINI_API_KEY: this module mints a short-lived
 * ephemeral auth token (ai.tokens.create, v1alpha) that the client uses as
 * its own `apiKey` when calling `ai.live.connect` directly from the browser
 * (see src/app/(app)/trainer/gemini-session-room.tsx). Ephemeral tokens are
 * documented as supported for the Gemini Developer API, v1alpha only.
 */
import { GoogleGenAI } from '@google/genai';
import type { TrainerPersona } from './persona';

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set in .env.local');
  }
  return key;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_LIVE_MODEL || DEFAULT_MODEL;
}

export interface GeminiSessionConfig {
  engine: 'gemini';
  ephemeralToken: string;
  model: string;
  persona: { id: string; name: string; situation: string };
  systemPrompt: string;
  firstMessage: string;
  timeCapMin: number;
  /** Gemini prebuilt voice name, forwarded from TrainerPersona.voice when set. */
  voice?: string;
}

/**
 * Mints a one-use ephemeral auth token scoped to a single Live session. The
 * client is expected to connect immediately, so the "new session" window is
 * kept short (60s) while the overall token lifetime (30 min) comfortably
 * covers the 8-minute hard cap plus connection setup.
 *
 * Deliberately does NOT lock the Live session config into the token
 * (no `liveConnectConstraints`) — the client sets model/config itself on
 * `ai.live.connect`, mirroring scripts/gemini-live-hebrew-probe.mjs. This
 * keeps the token minting generic and the persona config (systemPrompt,
 * firstMessage) is not secret — it's already sent to the client today for
 * the ElevenLabs path via `overrides`.
 */
export async function mintGeminiSession(persona: TrainerPersona): Promise<GeminiSessionConfig> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
      expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  });

  if (!token.name) {
    throw new Error('Gemini ephemeral token response missing name');
  }

  return {
    engine: 'gemini',
    ephemeralToken: token.name,
    model: getGeminiModel(),
    persona: {
      id: persona.id,
      name: persona.name,
      situation: persona.situation,
    },
    systemPrompt: persona.systemPrompt,
    firstMessage: persona.firstMessage,
    timeCapMin: persona.timeCapMin,
    voice: persona.voice,
  };
}
