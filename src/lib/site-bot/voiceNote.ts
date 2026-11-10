/**
 * Content depth (2026-11-10): the optional intake voice note ("walk me through a typical job"), recorded in the browser
 * with MediaRecorder. It would feed CollectedData.jobWalkthrough (B1 process steps) once transcribed.
 *
 * OFF, and it stores nothing. What is missing before it can be switched on:
 *  1. A safe storage path. The only upload route (src/app/api/upload) writes unauthenticated into public/uploads/<sessionId>,
 *     which would serve a customer's voice publicly; it is not used. A private, session-bound, size-capped intake upload
 *     route (with retention) is needed.
 *  2. Transcription (Hebrew speech to text) into CollectedData.jobWalkthrough, with the owner's consent wording.
 *  3. Hebrew labels for the record / stop controls (Tamar -> Noa): only the prompt and the skip label are approved.
 * Until all three exist, VOICE_NOTE_STEP_ENABLED stays false and the 3-question flow is unchanged.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

/** Master switch of the intake voice-note step. A code constant (not an env flag) so it cannot be flipped on by accident. */
export const VOICE_NOTE_STEP_ENABLED = false;

/** Record / stop control labels: null until Tamar -> Noa supply them (the engineer never authors Hebrew). */
export const VOICE_NOTE_CONTROL_LABELS: Readonly<{ record: string | null; stop: string | null }> = { record: null, stop: null };

/** Upper bound of one recording (the prompt asks for about half a minute). */
export const VOICE_NOTE_MAX_MS = 90_000;

/** True only when the switch is on, the control labels exist and the browser can record audio. */
export function voiceNoteStepAvailable(env: { MediaRecorder?: unknown; mediaDevices?: unknown } = {}): boolean {
  return VOICE_NOTE_STEP_ENABLED
    && Boolean(VOICE_NOTE_CONTROL_LABELS.record && VOICE_NOTE_CONTROL_LABELS.stop)
    && Boolean(env.MediaRecorder && env.mediaDevices);
}

/** A started recording: stop() resolves with the audio (kept in memory only; nothing is uploaded or stored). */
export interface VoiceNoteRecording {
  stop(): Promise<Blob>;
}

/** Start recording from the microphone (browser only). Stops itself after VOICE_NOTE_MAX_MS. */
export async function startVoiceNote(): Promise<VoiceNoteRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
  const done = new Promise<Blob>(resolve => {
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach(track => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    });
  });
  recorder.start();
  const timer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, VOICE_NOTE_MAX_MS);
  return {
    stop: () => {
      clearTimeout(timer);
      if (recorder.state !== 'inactive') recorder.stop();
      return done;
    },
  };
}
