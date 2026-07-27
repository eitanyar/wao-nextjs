'use client';

import type { TrainerEngine } from '@/lib/trainer/engine';
import ElevenLabsSessionRoom from './elevenlabs-session-room';
import GeminiSessionRoom from './gemini-session-room';

interface Props {
  engine: TrainerEngine;
  personaName: string;
  situation: string;
  timeCapMin: number;
}

const ENGINE_LABEL: Record<TrainerEngine, string> = {
  gemini: 'Gemini Live',
  elevenlabs: 'ElevenLabs',
};

/**
 * Engine dispatcher — picks the room implementation per §3 of
 * docs/specs/articulation-trainer.md. Server (page.tsx) resolves TRAINER_ENGINE
 * once and passes it down as a prop; swapping providers never touches this
 * component's callers.
 */
export default function TrainerSessionRoom({ engine, ...rest }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
          מנוע: {ENGINE_LABEL[engine]}
        </span>
      </div>
      {engine === 'gemini' ? <GeminiSessionRoom {...rest} /> : <ElevenLabsSessionRoom {...rest} />}
    </div>
  );
}
