'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';

interface TranscriptTurn {
  role: 'user' | 'agent';
  text: string;
  t: number;
}

interface GeminiSessionResponse {
  engine: 'gemini';
  ephemeralToken: string;
  model: string;
  persona: { id: string; name: string; situation: string };
  systemPrompt: string;
  firstMessage: string;
  timeCapMin: number;
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

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
/** Gemini Live's documented native-audio input/output PCM rates (see scripts/gemini-live-hebrew-probe.mjs). */

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function int16ArrayToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Naive linear-interpolation downsample from the mic's native rate to 16kHz mono. */
function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === INPUT_SAMPLE_RATE) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
    }
    return out;
  }
  const ratio = inputSampleRate / INPUT_SAMPLE_RATE;
  const outLength = Math.floor(input.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcIndex - i0;
    const sample = input[i0] * (1 - frac) + input[i1] * frac;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
  }
  return out;
}

/**
 * Gemini Live engine — default per docs/specs/articulation-trainer.md §3.
 * Browser connects DIRECTLY to the Live API using a one-use ephemeral token
 * minted server-side (POST /api/trainer/session never exposes GEMINI_API_KEY).
 *
 * Audio: mic captured via ScriptProcessorNode (deprecated but universally
 * supported; simplest path for M1 — an AudioWorklet upgrade is a fine follow-up),
 * downsampled to 16kHz PCM16 and streamed via session.sendRealtimeInput.
 * Output audio (24kHz PCM16) is decoded and scheduled on a dedicated playback
 * AudioContext; `interrupted` events (barge-in) flush the pending queue.
 */
export default function GeminiSessionRoom({ personaName, situation, timeCapMin, personaId, generatedId, level }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [statusLabel, setStatusLabel] = useState('לא מחובר');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hardCapSec = timeCapMin * 60;

  const sessionRef = useRef<Session | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const modelRef = useRef<string | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const inputBufferRef = useRef('');
  const outputBufferRef = useRef('');
  const sessionStartMsRef = useRef(0);
  const transcriptRef = useRef<TranscriptTurn[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // already stopped/ended — ignore
      }
    }
    activeSourcesRef.current = [];
    if (playbackContextRef.current) {
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;
    }
  }, []);

  const playChunk = useCallback((base64Pcm: string) => {
    const ctx = playbackContextRef.current;
    if (!ctx) return;

    const bytes = base64ToUint8Array(base64Pcm);
    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(nextPlayTimeRef.current, ctx.currentTime);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };
  }, []);

  const pushTurn = useCallback((role: 'user' | 'agent', text: string) => {
    if (!text.trim()) return;
    const turn: TranscriptTurn = { role, text, t: Math.round((Date.now() - sessionStartMsRef.current) / 1000) };
    transcriptRef.current = [...transcriptRef.current, turn];
    setTranscript(transcriptRef.current);
  }, []);

  const postTranscript = useCallback((turns: TranscriptTurn[]) => {
    if (turns.length === 0) return;
    fetch('/api/trainer/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine: 'gemini',
        model: modelRef.current,
        startedAt: startedAtRef.current,
        personaId,
        generatedId,
        level,
        turns,
      }),
    }).catch(err => console.error('[trainer][gemini] transcript post failed', err));
  }, [personaId, generatedId, level]);

  const teardownAudio = useCallback(() => {
    micProcessorRef.current?.disconnect();
    micProcessorRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    if (micContextRef.current) {
      micContextRef.current.close().catch(() => {});
      micContextRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;

    flushPlaybackQueue();
    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }
  }, [flushPlaybackQueue]);

  const handleStop = useCallback(() => {
    stopTimer();
    setPhase('ended');
    setStatusLabel('לא מחובר');
    // Long calls leave the user scrolled down at the transcript; bring them
    // back to the status card so the "start a new call" button is visible.
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Flush any in-flight (not yet turnComplete) fragments so nothing is lost.
    if (inputBufferRef.current.trim()) pushTurn('user', inputBufferRef.current);
    if (outputBufferRef.current.trim()) pushTurn('agent', outputBufferRef.current);
    inputBufferRef.current = '';
    outputBufferRef.current = '';

    sessionRef.current?.close();
    sessionRef.current = null;
    teardownAudio();

    postTranscript(transcriptRef.current);
  }, [stopTimer, pushTurn, teardownAudio, postTranscript]);

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setTranscript([]);
    transcriptRef.current = [];
    inputBufferRef.current = '';
    outputBufferRef.current = '';
    setElapsedSec(0);
    setPhase('connecting');
    setStatusLabel('מתחבר…');

    try {
      const res = await fetch('/api/trainer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedId }),
      });
      const data = (await res.json()) as GeminiSessionResponse;
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'session mint failed');
      }

      modelRef.current = data.model;
      startedAtRef.current = new Date().toISOString();
      sessionStartMsRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const micContext = new AudioContext();
      micContextRef.current = micContext;
      const source = micContext.createMediaStreamSource(stream);
      micSourceRef.current = source;
      // ScriptProcessorNode is deprecated but remains universally supported;
      // fine for M1's single-user staff tool. Buffer size 4096 ≈ 85-190ms
      // chunks depending on the mic's native sample rate.
      const processor = micContext.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      const ai = new GoogleGenAI({ apiKey: data.ephemeralToken, httpOptions: { apiVersion: 'v1alpha' } });

      const session = await ai.live.connect({
        model: data.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: data.systemPrompt,
          speechConfig: { languageCode: 'he-IL' },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setStatusLabel('מקשיב לך…'),
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (!content) return;

            if (content.interrupted) {
              flushPlaybackQueue();
              // Barge-in: cut whatever the agent had said mid-turn short.
              if (outputBufferRef.current.trim()) {
                pushTurn('agent', outputBufferRef.current);
                outputBufferRef.current = '';
              }
            }

            if (content.inputTranscription?.text) {
              inputBufferRef.current += content.inputTranscription.text;
            }
            if (content.outputTranscription?.text) {
              outputBufferRef.current += content.outputTranscription.text;
              setStatusLabel(`${personaName} מדבר…`);
            }

            const parts = content.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                playChunk(part.inlineData.data);
              }
            }

            if (content.turnComplete) {
              if (inputBufferRef.current.trim()) pushTurn('user', inputBufferRef.current);
              if (outputBufferRef.current.trim()) pushTurn('agent', outputBufferRef.current);
              inputBufferRef.current = '';
              outputBufferRef.current = '';
              setStatusLabel('מקשיב לך…');
            }
          },
          onerror: e => {
            console.error('[trainer][gemini] session error', e?.message ?? e);
            setErrorMsg('שגיאה בחיבור ל-Gemini Live — נסה שוב.');
          },
          onclose: e => console.log('[trainer][gemini] session closed', e?.reason ?? ''),
        },
      });
      sessionRef.current = session;

      const playbackContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      playbackContextRef.current = playbackContext;
      nextPlayTimeRef.current = playbackContext.currentTime;

      processor.onaudioprocess = event => {
        const input = event.inputBuffer.getChannelData(0);
        const pcm16 = downsampleTo16k(input, micContext.sampleRate);
        sessionRef.current?.sendRealtimeInput({
          audio: { data: int16ArrayToBase64(pcm16), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
        });
      };
      source.connect(processor);
      // Connect to a muted destination so the processor keeps firing (required by the Web Audio spec).
      const silence = micContext.createGain();
      silence.gain.value = 0;
      processor.connect(silence);
      silence.connect(micContext.destination);

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
      console.error('[trainer][gemini] start failed', err);
      setErrorMsg(err instanceof Error ? err.message : 'לא הצלחנו להתחיל שיחה.');
      setPhase('idle');
      teardownAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardCapSec, handleStop, flushPlaybackQueue, playChunk, pushTurn, teardownAudio, personaName, generatedId]);

  useEffect(() => {
    return () => {
      stopTimer();
      sessionRef.current?.close();
      teardownAudio();
    };
  }, [stopTimer, teardownAudio]);

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

      {transcript.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-lg mb-4">תמלול השיחה</h2>
          <div className="space-y-3">
            {transcript.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    turn.role === 'user' ? 'bg-[var(--accent)]/20 text-right' : 'bg-white/10 text-right'
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
