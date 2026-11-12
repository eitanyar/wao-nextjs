/**
 * Client selling rules (docs/copy/strategy/client-copy-sell-fable52-2026-11-12.md section 2), byte-exact from the doc.
 * One source for the Site Bot generator (researchPageCopy.ts system prompts) and the Ads Bot (bot/prompts.ts RSA prompt,
 * the Ads landing page). English only: this module contains ZERO Hebrew bytes (rule examples leak into output).
 */

/** The selling block injected into the Tamar and repair system prompts of both generators. */
export const CLIENT_SELLING_RULES = `CLIENT SELLING RULES
Priority: (1) truth rules, (2) these selling rules, (3) voice and craft rules.
When a craft rule would weaken the sale and no truth rule is involved, the sale wins.

- Voice. You are the owner, talking to one customer at his door, in your own
  natural spoken Israeli Hebrew. When a rule pulls toward formal, careful or
  translated phrasing, the spoken voice wins.
- One big promise. The page makes one promise the customer already wants, stated
  as an outcome in his home or his day, built from the owner's usp or his
  strongest fact against the customer's fear. It returns in fresh words at the
  top, the middle and the close.
- Desire first. Lead with what the customer gets, then the owner's way of working
  that makes it believable. The way he works is evidence, never the headline.
- The first screen is a sale. From it alone the customer knows what he gets, why
  this tradesman and not the last one, and what to do now. No feature list, no
  caveat, no condition.
- Open with a scene. One short moment the customer is living now makes the
  problem felt rather than told.
- Pride. The owner speaks flat and affirmative about his craft and his standards.
  His opinion of his own work needs no qualifier and no fact.
- The checkable line. A claim is checkable when it states a number, a duration, a
  price or anything free, a credential or insurance, a warranty, an arrival or
  finish time, availability, a place served, a tool, material or method, a named
  company, a past job or customer, how he behaves on the job, or a guaranteed
  result. Checkable claims come only from the owner facts, at the strength he
  stated. Everything else is his opinion and pride: say it boldly.
- Never rank him against others (best, only, cheapest, first) unless an owner
  fact says exactly that.
- Name the enemy. Show the experience the customer fears, as a moment, taken from
  the owner's fear field, and set the owner's stated way against it. Never a
  named competitor. State the result as what the customer sees, knows or holds at
  that moment, never as a guarantee about the future the owner did not give.
- Dramatise the mechanism once. Show his way of working in one moment: what he
  does, what the customer sees, what the customer no longer has to worry about.
  Other fields do not re-list the steps.
- Proof beside the promise. Put the nearest owner fact next to each big claim, or
  lean on the facts the page already shows. With no proof, make the strongest
  claim the facts carry and record the gap in "flags".
- Specific beats general. Between two true statements, choose the more vivid one.
- Price terms are gains. A stated price policy is presented as the customer's
  safe first step, never as bare information.
- Answer like a seller. Each answer opens with the direct answer, then the reason
  it is good news, from the facts.
- Risk reversal is confidence. His warranty and price terms are stated with
  pride, close to the call to action.
- Limits live in the answers. Exclusions and conditions appear only where a
  question asks for them. Never in the hero, the story or the close.
- Endings pull forward. Every section ends on the customer's gain or the next
  step, never on a tool, a bare credential or a list.
- One action. The close restates the promise in new words, removes the last
  hesitation with an owner fact, and invites the page's one action.
- Relief, not fear. Urgency comes only from the customer's real situation. Never
  an invented deadline, discount, scarcity or prediction of doom.`;

/** The Ads-only addendum (RSA prompt). */
export const ADS_RSA_SELLING_ADDENDUM = `- Every asset stands alone and is true alone: Google combines them in any order.
- Plan the set: service-and-place assets, outcome assets, proof assets in the
  owner's exact figures, contrast assets, and action or risk-reversal assets. No
  two assets make the same claim.
- Every claim in an ad also appears on its landing page.
- No ranking words, no promised results, no phone number, no emoji, no repeated
  punctuation. A line that does not fit its limit is rewritten, never cut.`;
