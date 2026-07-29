'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

interface TranscriptTurn {
  role: 'user' | 'agent';
  text: string;
}

interface SessionResponse {
  conversationToken: string;
  overrides: {
    agent: {
      language: 'he';
      firstMessage: string;
      prompt: { prompt: string };
    };
  };
  error?: string;
  message?: string;
}

interface Props {
  personaName: string;
  situation: string;
  timeCapMin: number;
  personaId: string;
  generatedId?: string;
  level: number;
}

type Phase = 'idle' | 'connecting' | 'live' | 'ended';

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Fallback engine (per docs/specs/articulation-trainer.md §3 — demoted from
 * M1 default after the Gemini Live bake-off). Unchanged from M1 except the
 * transcript POST now tags `engine: 'elevenlabs'` so the shared route can
 * branch correctly.
 *
 * useConversation must be used inside a ConversationProvider — this wrapper
 * supplies it.
 */
export default function ElevenLabsSessionRoom(props: Props) {
  return (
    <ConversationProvider>
      <ElevenLabsSessionRoomInner {...props} />
    </ConversationProvider>
  );
}

function ElevenLabsSessionRoomInner({ personaName, situation, timeCapMin, personaId, generatedId, level }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptTurn[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<TranscriptTurn[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const conversationIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardCapSec = timeCapMin * 60;

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      conversationIdRef.current = conversationId;
    },
    onMessage: ({ message, role }) => {
      if (!message) return;
      setLiveTranscript(prev => [...prev, { role: role === 'user' ? 'user' : 'agent', text: message }]);
    },
    onError: (message: string) => {
      console.error('[trainer] conversation error', message);
      setErrorMsg('שגיאה בשיחה — נסה שוב.');
    },
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchStoredTranscript = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch('/api/trainer/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'elevenlabs', conversationId, personaId, generatedId, level }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.transcript)) {
        const turns: TranscriptTurn[] = data.transcript
          .filter((t: { message: string | null }) => t.message)
          .map((t: { role: string; message: string }) => ({
            role: t.role === 'user' ? 'user' : 'agent',
            text: t.message,
          }));
        setFinalTranscript(turns);
      }
    } catch (err) {
      console.error('[trainer] transcript fetch failed', err);
    }
  }, [personaId, generatedId, level]);

  const handleStop = useCallback(() => {
    stopTimer();
    setPhase('ended');
    // Long calls leave the user scrolled down at the transcript; bring them
    // back to the status card so the "start a new call" button is visible.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    conversation.endSession();

    const conversationId = conversationIdRef.current;
    if (conversationId) {
      fetchStoredTranscript(conversationId);
    }
  }, [conversation, stopTimer, fetchStoredTranscript]);

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setLiveTranscript([]);
    setFinalTranscript(null);
    setElapsedSec(0);
    setPhase('connecting');
    conversationIdRef.current = null;

    try {
      const res = await fetch('/api/trainer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedId }),
      });
      const data = (await res.json()) as SessionResponse;
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'session mint failed');
      }

      conversation.startSession({
        conversationToken: data.conversationToken,
        connectionType: 'webrtc',
        overrides: data.overrides,
      });

      setPhase('live');
      timerRef.current = setInterval(() => {
        setElapsedSec(prev => {
          const next = prev + 1;
          if (next >= hardCapSec) {
            handleStop();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('[trainer] start failed', err);
      setErrorMsg(err instanceof Error ? err.message : 'לא הצלחנו להתחיל שיחה.');
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, hardCapSec, generatedId]);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const displayedTranscript = finalTranscript ?? liveTranscript;
  const statusLabel =
    conversation.status === 'connected'
      ? conversation.isSpeaking
        ? `${personaName} מדבר…`
        : 'מקשיב לך…'
      : conversation.status === 'connecting'
        ? 'מתחבר…'
        : 'לא מחובר';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-bold text-lg mb-2">התרחיש</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{situation}</p>
        <p className="text-xs text-[var(--muted)] mt-3">מגבלת זמן: {timeCapMin} דקות</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm mb-1">{statusLabel}</p>
        <p className="text-3xl font-black tabular-nums mb-4">
          {formatClock(Math.min(elapsedSec, hardCapSec))} / {formatClock(hardCapSec)}
        </p>

        {phase === 'idle' || phase === 'ended' ? (
          <button
            onClick={handleStart}
            className="rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 px-6 text-sm hover:opacity-90 transition-opacity"
          >
            {phase === 'ended' ? 'שיחה חדשה' : 'התחל שיחה'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={phase === 'connecting'}
            className="rounded-lg bg-red-500/80 text-white font-semibold py-2.5 px-6 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            סיים שיחה
          </button>
        )}

        {errorMsg && <p className="text-red-400 text-sm mt-3">{errorMsg}</p>}
      </div>

      {displayedTranscript.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-lg mb-4">
            {finalTranscript ? 'תמלול השיחה' : 'תמלול (בזמן אמת)'}
          </h2>
          <div className="space-y-3">
            {displayedTranscript.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    turn.role === 'user'
                      ? 'bg-[var(--accent)]/20 text-right'
                      : 'bg-white/10 text-right'
                  }`}
                >
                  <p className="text-[10px] text-[var(--muted)] mb-0.5">
                    {turn.role === 'user' ? 'אתה' : personaName}
                  </p>
                  <p>{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
