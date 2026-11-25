/**
 * Site Bot step 2c: what the browser may see of the home-page preview state (interview-step status and
 * interview-preview replies). Pure; split from interviewPreview.ts so interviewFlow.ts can show it without importing
 * the generation stack. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { previewRoundDue, type InterviewSession } from './interviewSession';

export type PreviewState = 'none' | 'generating' | 'ready' | 'failed';

export interface PreviewView {
  status: PreviewState;
  round: number;
  /** PREVIEW_FIX_LINK may be shown (first preview ready, the fix round unused). */
  fixAvailable: boolean;
  /** The fix round was used (PREVIEW_FIX_USED instead of the link). */
  fixUsed: boolean;
  /** The iframe source once ready (the round busts the iframe's own cache; the response is no-store anyway). */
  frameUrl: string | null;
}

export const PREVIEW_FRAME_PATH = '/api/site-bot/interview-preview-frame';

export function previewView(session: InterviewSession): PreviewView {
  const due = previewRoundDue(session);
  const current = due > 0 && session.previewRound === due ? session.previewStatus : null;
  const status: PreviewState = due === 0 ? 'none' : current ?? 'generating';
  return {
    status,
    round: session.previewRound,
    fixAvailable: status === 'ready' && due === 1 && !session.previewFixAt,
    fixUsed: Boolean(session.previewFixAt),
    frameUrl: status === 'ready' ? `${PREVIEW_FRAME_PATH}?r=${session.previewRound}` : null,
  };
}
