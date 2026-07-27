/**
 * Server-only ElevenLabs Conversational AI (Agents) helper for the
 * Articulation & EQ Trainer, M1. Never import this from a client component —
 * it reads ELEVENLABS_API_KEY from process.env.
 *
 * Engine file: data/trainer/engine.json (gitignored) caches the one agent id
 * we create on first use, so M1 needs zero dashboard clicks.
 */
import fs from 'fs';
import path from 'path';
import { DANNY_PERSONA } from './persona';

const API_BASE = 'https://api.elevenlabs.io/v1';
const ENGINE_FILE = path.join(process.cwd(), 'data', 'trainer', 'engine.json');

interface EngineFile {
  agentId: string;
  createdAt: string;
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ELEVENLABS_API_KEY is not set in .env.local');
  }
  return key;
}

function readEngineFile(): EngineFile | null {
  try {
    const raw = fs.readFileSync(ENGINE_FILE, 'utf8');
    return JSON.parse(raw) as EngineFile;
  } catch {
    return null;
  }
}

function writeEngineFile(data: EngineFile): void {
  fs.mkdirSync(path.dirname(ENGINE_FILE), { recursive: true });
  fs.writeFileSync(ENGINE_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function createAgent(apiKey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'WAO Trainer — Articulation & EQ (M1)',
      conversation_config: {
        agent: {
          language: 'he',
          first_message: DANNY_PERSONA.firstMessage,
          prompt: {
            prompt: DANNY_PERSONA.systemPrompt,
          },
        },
      },
      tags: ['wao-trainer', 'm1'],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs agent create failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { agent_id: string };
  if (!data.agent_id) {
    throw new Error('ElevenLabs agent create response missing agent_id');
  }
  return data.agent_id;
}

/**
 * Returns the cached trainer agent id, creating the agent via the
 * ElevenLabs API on first call and caching it in data/trainer/engine.json.
 */
export async function ensureTrainerAgentId(): Promise<string> {
  const cached = readEngineFile();
  if (cached?.agentId) return cached.agentId;

  const apiKey = getApiKey();
  const agentId = await createAgent(apiKey);
  writeEngineFile({ agentId, createdAt: new Date().toISOString() });
  return agentId;
}

/** Mints a short-lived WebRTC conversation token — the API key never reaches the client. */
export async function mintConversationToken(agentId: string): Promise<string> {
  const apiKey = getApiKey();
  const url = new URL(`${API_BASE}/convai/conversation/token`);
  url.searchParams.set('agent_id', agentId);

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs conversation token failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { token: string };
  if (!data.token) {
    throw new Error('ElevenLabs conversation token response missing token');
  }
  return data.token;
}

export interface ConversationTurn {
  role: 'user' | 'agent';
  message: string | null;
  time_in_call_secs?: number;
}

export interface ConversationRecord {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript: ConversationTurn[];
}

/**
 * Fetches the full transcript for a completed conversation. The transcript
 * can lag a few seconds after the call ends while ElevenLabs finishes
 * processing, so the caller should retry briefly if status isn't "done".
 */
export async function getConversation(conversationId: string): Promise<ConversationRecord> {
  const apiKey = getApiKey();
  const res = await fetch(`${API_BASE}/convai/conversations/${conversationId}`, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs get conversation failed (${res.status}): ${body}`);
  }

  return (await res.json()) as ConversationRecord;
}

export interface ElevenLabsSessionConfig {
  engine: 'elevenlabs';
  conversationToken: string;
  agentId: string;
  persona: { id: string; name: string; situation: string };
  overrides: {
    agent: {
      language: 'he';
      firstMessage: string;
      prompt: { prompt: string };
    };
  };
  timeCapMin: number;
}

/** Fallback engine (per §3, demoted from M1 default) — behind the engine.ts abstraction. */
export async function mintElevenLabsSession(): Promise<ElevenLabsSessionConfig> {
  const agentId = await ensureTrainerAgentId();
  const conversationToken = await mintConversationToken(agentId);

  return {
    engine: 'elevenlabs',
    conversationToken,
    agentId,
    persona: {
      id: DANNY_PERSONA.id,
      name: DANNY_PERSONA.name,
      situation: DANNY_PERSONA.situation,
    },
    overrides: {
      agent: {
        language: 'he',
        firstMessage: DANNY_PERSONA.firstMessage,
        prompt: { prompt: DANNY_PERSONA.systemPrompt },
      },
    },
    timeCapMin: DANNY_PERSONA.timeCapMin,
  };
}
