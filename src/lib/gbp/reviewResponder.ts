/**
 * Bad-review first-responder — draft pipeline (Reputation Loop back-half, stage 2 of 4).
 * Turns each detected bad review (task _002's `pollClientReviews`) into an AI-drafted Hebrew
 * reply held in a per-client responder queue for human approval — NEVER auto-posted — plus an
 * owner-notify wa.me link following the owner-forwards pattern (same posture as the
 * review-flywheel hook in src/app/api/leads/route.ts). Posting the approved reply is task 005.
 *
 * `draftRepliesForBadReviews` takes the already-loaded `SharedClientRecord` rather than a
 * clientId + internal `loadClient()` call, so the function stays pure and testable with a temp
 * `baseDir` and zero fs reads outside it.
 */

import type { SharedClientRecord } from '../shared/clients';
import type { GbpReviewSnapshotItem } from './reviewStore';
import { buildWaLink } from '../gmb/whatsapp';
import { buildBadReviewOwnerNotification, REVIEW_REPLY_SYSTEM_PROMPT, REVIEW_REPLY_FEWSHOT } from './reviewReplyPrompt';
import { appendReviewResponderQueueItem, type ReviewResponderQueueItem } from './reviewResponderStore';
import { callGeminiChatText } from '../ai/gemini-fast';
import { resolveQwenEndpoint, selectLlmProvider } from '../ai/llmProvider';

export type ReplyDrafter = (
  systemPrompt: string,
  fewshot: { review: string; reply: string }[],
  reviewComment: string,
  businessContext: { businessName: string; businessNiche: string }
) => Promise<string>;

/**
 * For each bad review: call the drafter, build the owner-notify message, wrap it with a wa.me
 * link using the client's `approvalWhatsapp` (null link + console.warn if missing, same posture
 * as the flywheel hook in src/app/api/leads/route.ts), append to the queue, return appended
 * items. A drafter failure for one review logs and skips that review — never throws out of the
 * batch.
 */
export async function draftRepliesForBadReviews(
  client: SharedClientRecord,
  badReviews: GbpReviewSnapshotItem[],
  drafter: ReplyDrafter,
  baseDir?: string
): Promise<ReviewResponderQueueItem[]> {
  const appended: ReviewResponderQueueItem[] = [];
  const businessName = client.brandName || client.clientId;
  const businessNiche = client.businessNiche || '';
  const ownerName = client.approvalContact || client.clientId;

  for (const review of badReviews) {
    let draftReply: string;
    try {
      draftReply = await drafter(REVIEW_REPLY_SYSTEM_PROMPT, REVIEW_REPLY_FEWSHOT, review.comment, {
        businessName,
        businessNiche,
      });
    } catch (err) {
      console.warn(
        `[reviewResponder] drafter failed for review "${review.reviewId}" (client "${client.clientId}"):`,
        err instanceof Error ? err.message : String(err)
      );
      continue;
    }

    let ownerNotifyWaLink: string | null = null;
    if (!client.approvalWhatsapp) {
      console.warn(
        `[reviewResponder] client "${client.clientId}" is missing approvalWhatsapp — skipping owner-notify link for review "${review.reviewId}"`
      );
    } else {
      const message = buildBadReviewOwnerNotification({
        ownerName,
        businessName,
        reviewerName: review.reviewerName,
        starRating: review.starRating,
        reviewComment: review.comment,
        draftReply,
      });
      ownerNotifyWaLink = buildWaLink(client.approvalWhatsapp, message);
    }

    const item: ReviewResponderQueueItem = {
      reviewId: review.reviewId,
      clientId: client.clientId,
      reviewerName: review.reviewerName,
      starRating: review.starRating,
      reviewComment: review.comment,
      draftReply,
      ownerNotifyWaLink,
      status: 'drafted',
      generatedAt: new Date().toISOString(),
    };

    appendReviewResponderQueueItem(item, baseDir);
    appended.push(item);
  }

  return appended;
}

export type GbpReplyDrafterOptions = {
  /** Injected transport for tests; production uses globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
};

type ReplyMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function buildReplyMessages(
  systemPrompt: string,
  fewshot: { review: string; reply: string }[],
  reviewComment: string,
  businessContext: { businessName: string; businessNiche: string }
): ReplyMessage[] {
  const messages: ReplyMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\nbusinessName: ${businessContext.businessName}\nbusinessNiche: ${businessContext.businessNiche}`,
    },
  ];

  for (const pair of fewshot) {
    messages.push({ role: 'user', content: pair.review });
    messages.push({ role: 'assistant', content: pair.reply });
  }

  messages.push({ role: 'user', content: reviewComment });
  return messages;
}

/**
 * Production drafter. Provider: LLM_PROVIDER_GBP_REPLY (src/lib/ai/llmProvider.ts) — gemini by
 * default since D3 (2026-11-15); qwen-metered / qwen-token-plan keep the original qwen3.8-max
 * request. Same system prompt, few-shot pairs and plain-text output on every provider. The only
 * place in this module with network code; tests inject `fetch`.
 */
export function createGbpReplyDrafter(options: GbpReplyDrafterOptions = {}): ReplyDrafter {
  return async (systemPrompt, fewshot, reviewComment, businessContext) => {
    const messages = buildReplyMessages(systemPrompt, fewshot, reviewComment, businessContext);
    const selection = selectLlmProvider('gbp_reply');

    if (selection.provider === 'gemini') {
      const [system, ...turns] = messages;
      return callGeminiChatText(
        system.content,
        turns.map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
        { thinkingLevel: 'HIGH', temperature: 0.7, usage: { workload: 'gbp_reply' }, ...(options.fetch ? { fetch: options.fetch } : {}) },
      );
    }

    const endpoint = resolveQwenEndpoint('gbp_reply');
    if (!endpoint) {
      throw new Error(`createGbpReplyDrafter: missing credentials for ${selection.provider} (${selection.envVar})`);
    }

    const response = await (options.fetch ?? globalThis.fetch)(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3.8-max',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`createGbpReplyDrafter: Qwen API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('createGbpReplyDrafter: empty response from Qwen');
    }

    return String(text).trim();
  };
}
