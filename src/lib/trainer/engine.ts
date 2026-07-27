/**
 * Engine abstraction for the Articulation & EQ Trainer. Per
 * docs/specs/articulation-trainer.md §3: "The engine sits behind one server
 * interface so swapping providers never touches UI or scenario data."
 *
 * Default: gemini (bake-off winner, 26.7.2026). ElevenLabs stays available as
 * a non-default fallback behind TRAINER_ENGINE=elevenlabs.
 */
import type { GeminiSessionConfig } from './gemini';
import type { ElevenLabsSessionConfig } from './elevenlabs';

export type TrainerEngine = 'gemini' | 'elevenlabs';

export function getTrainerEngine(): TrainerEngine {
  const raw = (process.env.TRAINER_ENGINE || 'gemini').trim().toLowerCase();
  return raw === 'elevenlabs' ? 'elevenlabs' : 'gemini';
}

export type TrainerSessionConfig = GeminiSessionConfig | ElevenLabsSessionConfig;

/** Mints a session config for whichever engine is configured via TRAINER_ENGINE. */
export async function mintTrainerSession(): Promise<TrainerSessionConfig> {
  const engine = getTrainerEngine();
  if (engine === 'elevenlabs') {
    const { mintElevenLabsSession } = await import('./elevenlabs');
    return mintElevenLabsSession();
  }
  const { mintGeminiSession } = await import('./gemini');
  return mintGeminiSession();
}
