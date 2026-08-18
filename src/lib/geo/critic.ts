import { callQwenJSON } from '@/lib/ai/qwen-fast';
import type { GeoAction } from './actions';

/**
 * GEO distinctiveness critic (2026-08-17) — a second, independent model
 * (Qwen 3.7 Plus, different vendor from the Gemini generator, same
 * independence principle as the Claude verifier never being Grok) reads an
 * already-flagged action and judges ONE axis only: is this answer generic
 * or citation-worthy for an AI Overview, and is there a distinctiveness /
 * interlinking opportunity the generator left on the table.
 *
 * Deliberately does NOT judge grammar, register, or native Hebrew voice —
 * that axis is Qwen's own known weakness (see the 2026-08-17 dry-run
 * comparison: calque idioms, register drift) and is already owned by Noa's
 * proofing pass plus the deterministic gates in geo-generate-content.mjs.
 * Asking this critic to also grade correctness would mean paying for a
 * worse version of a check that already exists.
 *
 * Thinking-ON deliberately: the same dry-run showed reasoning depth is what
 * produced the richer grounding-awareness and the interlinking catch —
 * exactly the signal this critic exists to surface. This mirrors item 1's
 * static gates (register/grounding/schema) but adds a fourth, LLM-judged
 * signal none of those three can produce.
 *
 * One-way critique only — never a multi-turn "debate" with the generator
 * (rejected explicitly as theater with no evidence behind it, and each
 * extra turn multiplies both cost and Qwen's ~100s+ latency for no shown
 * benefit).
 *
 * Output is flags + one-line reasons ONLY. This function never rewrites or
 * regenerates content — that would collapse the human-in-the-loop trust
 * story the whole review queue exists to protect. A human reviewer reads
 * the flags and decides; the critic never acts on its own judgment.
 *
 * Validation status: NOT yet trusted at production scale. Per Lior's
 * 2026-08-17 verdict, this must be measured against real review-time data
 * on Retter's actual queue (before/after edit time + flag hit rate) before
 * being relied on beyond a manual, reviewer-triggered check. Until that
 * validation happens, this is an on-demand tool a reviewer chooses to run,
 * not something wired into the automatic generation pipeline.
 */

export interface CriticResult {
  distinctive: boolean;
  flags: string[];
  reasons: string[];
  citationNote: string;
}

const CRITIC_SYSTEM_PROMPT = `את מבקרת תוכן GEO/AIO עבור WAO — תפקידך הוא לשפוט ציר אחד ויחיד: האם התוכן ייחודי וראוי לציטוט בתשובת AI, או גנרי מדי.

אל תשפטי דקדוק, טבעיות השפה, או ניסוח — זה לא תפקידך. שפטי אך ורק:
1. האם התוכן עוגן בעובדות ספציפיות שרק העסק הזה יכול לתת (מספרים, שמות, שיטות, תעודות) — או שהוא יכול היה להתאים לכל עסק דומה?
2. האם יש הזדמנות קישור פנימי (interlinking) או עובדה ייחודית זמינה בהקשר הלקוח שלא נוצלה?
3. האם התשובה מספיק "צפופה בעובדות" כדי שמנוע AI ירצה לצטט אותה, לעומת תשובה גנרית שקל להחליף במקור אחר?

החזירי JSON בלבד:
{
  "distinctive": true/false,        // true אם התוכן כבר מספיק ייחודי, false אם צריך שיפור
  "flags": [],                      // מערך קצר של דגלים ספציפיים (לדוגמה: "שאלה 2 גנרית לגמרי", "לא נוצלה עובדת המחיר")
  "reasons": [],                    // הסבר של שורה אחת לכל דגל — למה זה בעיה עבור ציטוט AI
  "citationNote": ""                // משפט אחד: הסיכוי הכללי שהתוכן הזה ייבחר לציטוט, ולמה
}
אל תכתבי מחדש שום תוכן. אל תציעי ניסוח חדש. רק שפטי ודגלי.`;

function buildUserMessage(action: GeoAction): string {
  return `## שאלת המטרה
"${action.query}"

## התוכן שנוצר (לבדיקה)
${action.content.hebrewContent}

## עובדות מאומתות זמינות מהקשר הלקוח (לבדוק אם נוצלו)
${action.content.factualClaims?.length ? action.content.factualClaims.join('\n') : '(לא סופקו עובדות נוספות)'}`;
}

export async function runDistinctivenessCritic(action: GeoAction): Promise<CriticResult> {
  const raw = await callQwenJSON(CRITIC_SYSTEM_PROMPT, buildUserMessage(action), {
    model: 'qwen3.7-plus',
    // Thinking left ON (no `think: false`) — deliberate, see file header.
  });
  const parsed = JSON.parse(raw);
  return {
    distinctive: Boolean(parsed.distinctive),
    flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    citationNote: String(parsed.citationNote ?? ''),
  };
}
