# Visual/Component Design — Adam Recommendation Audit Review Surface

Author: ux (Maya)
Date: 2026-08-03
Status: Ready for nextjs-engineer (Eitan-Dev) to build from. This is component/visual design only —
it does not redefine any interaction logic from `docs/specs/adam-recommendation-audit-interaction-model.md`
(Dror), which is locked. Where this doc names a route, field, or status value, it is quoting Dror's
spec for layout purposes only — Eitan-Dev owns the actual wiring.
Grounded in: `src/app/(app)/geo/action/[actionId]/page.tsx` (one-decision-per-page shape),
`src/components/geo/*` (existing component conventions), `src/app/globals.css` (design tokens),
`src/lib/bidi.tsx` (`renderMixed()` — reused here, not reinvented).

---

## 0. Design tokens used (all existing — no new tokens introduced)

```
--bg #060709   --surface #0D0F15   --elevated #131620
--accent #4AE3B5 (approve/positive)   --accent-dim / --accent-border (accent at low opacity)
--text #EEE9E2   --muted #8892A4   --border #181B27   --subtle #252836
--radius-md 16px (cards)   --radius-pill (badges)
--font-heading: Rubik   --font-body: Assistant
```

One net-new semantic use, no new hex value: a **reject/warning tone** reuses the site's existing
`red-400` / `red-500` utility already used for error states in `StatusBar.tsx` and `MarkDoneBar.tsx`
— kept desaturated and outline-only (never a solid red fill) so it reads as "caution," not alarm.

All layout uses **logical CSS properties** (`inset-inline-start`, `ps-`/`pe-`, `start-`/`end-`),
matching the existing pattern in `StatusBar.tsx` (`insetInlineStart`) and `MarkDoneBar.tsx`
(`sticky bottom-0 start-0 end-0`). No physical `left`/`right` anywhere in this design.

---

## 1. Page shell — mirrors `/geo/action/[actionId]`

```
<main dir="rtl" lang="he" className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32">
  <ReviewContext />        (§1.1 — client + stage-gate + trust-clock line, condensed)
  <RecommendationCard />   (§2 — the one open decision)
</main>
```

Single column, `max-w-2xl`, generous vertical rhythm — identical shape to the client-facing GEO
action page: one `<main>`, one card, nothing beside it competing for attention. No sidebar, no
table, no queue list on this page. When the card resolves (Approve or Reject submitted), the page
either shows the next single card (if one exists for this client/stage-gate) or a clean "done for
now" end state — mirroring `MarkDoneBar.tsx`'s resolved-state pattern (a `role="status"` panel,
not a redirect to a list).

### 1.1 `ReviewContext` — condensed trust-clock, shown *above* the card as read-only framing

A single muted line above the card, giving Eitan the stakes before he reads the recommendation —
not decorative, but deliberately quiet (`text-sm text-[var(--muted)]`, no card/border of its own):

```
<p className="mb-4 text-sm text-[var(--muted)]">
  {renderMixed(clientName)} — {stageGateName}: 5 מתוך 8 שבועות תקינים ברצף
</p>
```

This is the *compact* form of the full trust-clock component (§4) — same numbers, no reset-trace
link, no paused-weeks line, just orientation. The full component (with reset trace + paused-weeks
line) lives on the per-client dashboard view (§5), not repeated in full here — repeating the reset
link on every single card would over-weight a Reject that may be weeks old.

---

## 2. `RecommendationCard` — the one-card-per-decision surface

```
┌─────────────────────────────────────────────────────────┐
│  ממתין להחלטה                              +2 ממתינות ללקוח זה │  ← status pill (start) + queue-depth note (end), same row as StatusBar.tsx's pill+meta pattern
│                                                           │
│  הצעה: הורדת תקציב ב-Search — קמפיין מיתוג          [risk: גבוה]│  ← h1, muted risk tag beside it (not a CTA, not colored green/red — border-only chip)
│                                                           │
│  קצב ההוצאה 34% מעל התקציב השבועי היעד.                   │  ← whyNeeded, body text, renderMixed() for numbers/brand tokens
│  ▸ למה? [כמה שאלות נשאלו: 0]                              │  ← disclosure trigger, SEPARATE region from decision row below
│                                                           │
│  ───────────────────────────────────────────────────     │  ← visual rule separating "read the evidence" from "make the decision"
│                                                           │
│  [   אשר   ]              [ דחה / תקן ]                    │  ← decision row: solid accent vs. outlined red — only these two live here
└─────────────────────────────────────────────────────────┘
```

(RTL: "אשר" renders start-most / visually rightmost in the flow; DOM order should still be
Approve-then-Reject as written above — logical order, not physically hardcoded.)

### 2.1 Card container
`rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]`
— reuses `PathCard.tsx`'s fieldset-card look-and-feel exactly (same border/surface/radius trio).

### 2.2 Status pill + queue-depth note (top row)
- Status pill: reuses `StatusBar.tsx`'s `STATUS_CONFIG` pattern exactly — add one entry,
  `pending-review: { label: 'ממתין להחלטה', color: 'bg-yellow-500/15 text-yellow-400' }`. Same
  component, same file, no new visual language.
- Queue-depth note: **plain text, not a badge.** `<p className="text-xs text-[var(--muted)]">+2
  ממתינות ללקוח זה</p>` — no border, no pill shape, no `--accent` color, no icon, `cursor: default`
  (not `pointer`), no `:hover` state, not a `<button>`/`<a>`, not in tab order. This is the
  deliberate visual signal that it is inert — everything else interactive on the page *looks*
  interactive (pill-shaped, bordered, or a button); this is the one thing that's just a sentence.

### 2.3 Title + risk chip
`<h1 className="text-xl font-bold">{renderMixed(recommendedAction)}</h1>` with an inline chip after
it: `<span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">סיכון: גבוה</span>`
— outline-only, `--muted` text regardless of risk level. Risk level changes the *word* (נמוך /
בינוני / גבוה), never the color — color-coding risk would read as a traffic light and creep toward
the "gamified / oversells" territory the spec explicitly rules out for the trust-clock; keeping the
same restraint on risk chips keeps the whole page's visual vocabulary consistent (plain facts,
no traffic lights anywhere on this surface).

### 2.4 `whyNeeded` body
Plain paragraph, `text-sm text-[var(--text)] leading-relaxed`, run through `renderMixed()` (it will
contain numbers, %, and possibly Latin campaign/product names — same bidi risk as any other mixed
Hebrew/Latin string on the site, same fix).

---

## 3. The "Why?" disclosure — structurally separate from the decision row (the hard constraint)

This is the load-bearing visual decision in the spec: **"Why?" is not a button next to Approve and
Reject.** It is a `<details>`-pattern disclosure attached directly under the `whyNeeded` paragraph,
visually and semantically inside the *evidence* region of the card, with a full-width horizontal
rule (`§2` ASCII above) separating that whole region from the *decision* region below it. A user
scanning the card sees two zones, not three buttons — "read/ask" on top, "decide" on the bottom.

```tsx
<button
  aria-expanded={open}
  aria-controls="why-thread"
  className="mt-2 flex items-center gap-1 text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)]"
>
  <span aria-hidden>▸</span> למה?
</button>
```
- No fill, no border, no accent color, no icon that reads as an action (no arrow-to-a-page, no "→")
  — it's a disclosure caret (`▸`/`▾`), the same visual grammar as an FAQ accordion, not a CTA.
- On open (`id="why-thread"`, `role="region" aria-label="שרשור שאלות"`), focus moves into the
  question `<textarea>` (mirrors `MarkDoneBar.tsx`'s `confirmRef.current?.focus()` pattern on state
  change). On close, focus returns to the disclosure trigger.
- Thread panel styling is deliberately **neutral**, not escalation-toned: `bg-[var(--elevated)]
  rounded-[var(--radius-sm)] p-4 mt-2 border border-[var(--border)]` — no red, no yellow, no
  "alert" iconography anywhere in this panel. Adam's answers are visually tagged
  (`text-xs text-[var(--muted)]`, "Adam ענה:") but not chat-bubble styled — this is a Q&A log
  entry, not a messaging UI, to avoid implying urgency/back-and-forth pressure.
- The question input + submit ("שלח שאלה") lives inside this panel only. **The Approve/Reject
  buttons in §2's decision row remain visible and enabled the entire time the thread is open** —
  nothing about opening "Why?" hides or disables the real decision, reinforcing that asking is not
  a gate on deciding.
- Multiple questions stack as a simple list inside the same panel (question → answer → question →
  answer), newest at the bottom, panel scrolls internally past ~6 turns (`max-h-80 overflow-y-auto`)
  rather than growing the page indefinitely.

---

## 4. Decision row — Approve vs. Reject/Adjust, visually asymmetric on purpose

```tsx
<div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center gap-4">
  <button className="min-h-[44px] flex-1 rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--bg)] hover:opacity-90">
    אשר
  </button>
  <button className="min-h-[44px] rounded-xl border border-red-400/40 px-6 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10">
    דחה / תקן
  </button>
</div>
```
- **Approve**: solid fill, `--accent`, `flex-1` (visually dominant width) — the expected, common
  path gets the bigger, filled target (same visual weight `MarkDoneBar.tsx` gives its primary CTA).
- **Reject/Adjust**: outline-only, red-tinted border/text, fixed (non-flex) width, visually smaller
  — deliberately the "less inviting to hit by accident" shape, without being hidden or hard to use
  when actually needed.
- Clicking Reject/Adjust does **not** submit immediately — it expands an inline required field in
  place (same card, no navigation, no modal):
  ```tsx
  <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/5 p-4">
    <label className="mb-1 block text-xs font-medium text-red-300">מה לא מתאים כאן?</label>
    <textarea required className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-sm" />
    <div className="mt-3 flex gap-2">
      <button className="rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-[var(--bg)]">אשר דחייה</button>
      <button className="text-sm text-[var(--muted)] underline">ביטול</button>
    </div>
  </div>
  ```
  This two-step (click → confirm-with-reason) is a plain, honest friction: it makes the
  clock-resetting action require a moment's pause and a written reason, without adding a modal
  dialog (modals interrupt the "stay on this one card" model this whole page is built around).
  Reason text is `required` — matches Dror's `correctionNote` field — and this text is exactly
  the string that later appears in the reset-trace link (§4.2 below).

---

## 5. Trust-clock display — `TrustClockLine` component (§3.3 of Dror's spec)

Two places it renders: condensed above the review card (§1.1), and in full on a per-client
dashboard (list of clients × stage-gates, out of layout-detail scope here beyond the row shape
below — it follows the existing `admin/clients/page.tsx` row convention: `rounded-lg border
border-white/10 bg-white/5 px-4 py-3` per row).

```tsx
<div className="space-y-1">
  <p className="text-sm text-[var(--text)]">
    {renderMixed(clientName)} — {stageGateName}:{' '}
    <span className="font-semibold">5 מתוך 8</span> שבועות תקינים מאז התיקון האחרון
  </p>
  {pausedWeeks > 0 && (
    <p className="text-xs text-[var(--muted)]">
      ({pausedWeeks} שבועות בהשהיה — לא עברו סף המלצה)
    </p>
  )}
</div>
```

**Explicitly not present, by design instruction:** no progress bar with a green fill, no percentage
ring, no streak flame/badge icon, no "on track!" / "כל הכבוד" language, no color change as the
count climbs (5/8 and 1/8 render in identical `--text`/`--muted` typography — only the numbers
differ). The one permitted concession to "checkable at a glance" is a plain **8-tick row** — small
neutral dashes, no color semantics, filled dashes in `--text`, unfilled in `--border`:

```tsx
<div className="mt-1 flex gap-1" aria-hidden="true">
  {Array.from({ length: 8 }).map((_, i) => (
    <span key={i} className={`h-1 w-4 rounded-full ${i < weeksClean ? 'bg-[var(--text)]' : 'bg-[var(--border)]'}`} />
  ))}
</div>
```
`aria-hidden` because the sentence above it already states the count in words — the ticks are a
glance-aid, not the source of truth, and must never be the *only* place the number appears (screen
reader users get the full sentence either way).

### 5.1 Reset trace (only rendered when the clock is at 0/8 due to a Reject, not a fresh stage-gate)

```tsx
<p className="text-xs text-[var(--muted)]">
  האיפוס נובע מהחלטה ב־{formattedDate} —{' '}
  <a href={`/admin/review/audit/${taskId}`} className="text-[var(--accent)] underline underline-offset-2">
    צפה בכרטיס
  </a>
</p>
```
Single sentence, single link, `--accent` used here only because it's a genuine, intentional
navigation affordance (unlike the queue-depth note in §2.2) — this is the one place on the whole
surface where accent-colored text means "this is clickable," kept consistent with how `--accent`
is used as the link/CTA color everywhere else in the codebase (`PathCard.tsx`'s "לחיבור וורדפרס"
link, `MarkDoneBar.tsx`'s next-action link).

### 5.2 Stage-gate archive note
When a client has a completed/archived prior stage-gate, it renders as a second, visually
de-emphasized line block below the active clock — same typography as the paused-weeks line, past
tense, no checkmark/trophy icon:
```
שלב אות-הביניים (ליד מאומת): 8 מתוך 8, הושלם ב-14.6.2026
```

---

## 6. Read-only audit trail (§1.1 of Dror's spec — separate page, not this one)

Table/list, not cards — this is the one place a list view is correct, because it is explicitly
never a decision surface. Each row: date, client (`renderMixed`), stage-gate, action type
(Approve / Reject / auto-approved — plain text label, not a colored badge, consistent with the
"no color-coded outcome language" instruction extending even to the historical record), and for
Rejects, the `correctionNote` shown inline or in a `<details>` per row. Rows are not clickable into
a "make a new decision" state — only the specific deep-link from §5.1 lands here with that one row
expanded/highlighted via `#anchor` + `:target` styling (no JS scroll-hijacking needed).

---

## 7. Accessibility checklist (WCAG basics applied to this surface)

- `dir="rtl" lang="he"` on the page `<main>`; every mixed Hebrew/Latin string (client names, dollar/
  shekel figures with currency codes, campaign names) run through `renderMixed()` — zero raw Latin
  runs left unwrapped.
- Card heading (`<h1>`) receives focus on page load via a ref, same pattern as
  `MarkDoneBar.tsx`'s `confirmRef.current?.focus()` — keyboard/screen-reader users land on the
  decision, not the page chrome.
- Approve / Reject-Adjust / Why-toggle are all real `<button>` elements (not `<div onClick>`),
  min `44×44` touch target, visible `:focus-visible` outline (already global via `globals.css`'s
  `:focus-visible { outline: 2.5px solid var(--accent) }` — no override needed).
- Reject's reason `<textarea>` is `required` with a paired `<label>`; submit disabled
  (`aria-disabled`) until non-empty — never a silent no-op click.
- Why-disclosure uses `aria-expanded` + `aria-controls`; focus moves into/out of the panel on
  toggle, per §3.
- Queue-depth note (§2.2) is deliberately outside the tab order and not a live region — it's static
  per page load, not an urgent update; no `aria-live` needed (avoids unnecessary screen-reader
  interruption).
- Color is never the sole differentiator: Approve vs. Reject differ in fill (solid vs. outline),
  width (flex-1 vs. fixed), label, and position, not just hue — passes for color-blind reviewers
  even before contrast is checked. Both `--accent` on `--bg` and `red-400` on `--surface` meet
  WCAG AA contrast (existing site values, already in use elsewhere).
- No horizontal scroll at 390px width: `max-w-2xl` container with `px-4`, decision-row buttons wrap
  to stacked (`flex-col`) under a `sm:` breakpoint if the two buttons plus gap would ever pinch
  below ~360px — verify at build time on an actual 390×844 viewport.

---

## 8. Component/file plan (for Eitan-Dev — naming only, not implementation)

Mirrors the existing `src/components/geo/` convention:
```
src/components/admin/review/
  ReviewContext.tsx        (§1.1 condensed trust-clock line)
  RecommendationCard.tsx   (§2 shell)
  WhyDisclosure.tsx        (§3 — trigger + panel + question form)
  DecisionRow.tsx          (§4 — Approve button + Reject-Adjust button + inline reason field)
  TrustClockLine.tsx       (§5 — full form, used on the client dashboard)
  QueueDepthNote.tsx       (§2.2 — trivial, but kept as its own component so it can never
                             accidentally inherit interactive styling from a shared button class)
```
`QueueDepthNote` being its own tiny component (not inline JSX reused from a badge/pill utility) is
intentional — it guarantees no shared class change to "pill" components elsewhere on the site can
accidentally make the counter look clickable later.

---

## 9. Copy note (placeholders only — not final wording)

Button/label strings above (`אשר`, `דחה / תקן`, `למה?`, `מה לא מתאים כאן?`) are structural
placeholders sized and positioned correctly for Hebrew RTL layout — final wording review belongs to
**copywriter (Tamar)** for tone and **language-qa (Noa)** for typography (gershayim/geresh, no
double spaces) before ship, per the standard copy gate. Nothing here should be treated as
approved copy.

---

## 10. Handoffs

- **nextjs-engineer (Eitan-Dev):** build from this + Dror's interaction-model spec. Component names
  in §8 are a suggestion, not a requirement — logic/routing/data wiring (statuses, log formats,
  clock computation) is entirely his, per Dror's §6.
- **copywriter (Tamar):** final wording for all button/field labels (§9).
- **language-qa (Noa):** typography pass on final Hebrew copy once Tamar's wording lands.
- **verifier (Roni):** once built, confirm — bidi gate (`grep -oP '<bdi dir="ltr">\([^)<]*</bdi>'` = 0
  on the rendered review page), no horizontal overflow at 390px, focus lands on the card heading,
  Why-toggle never disables/hides the decision row, Reject requires a non-empty reason before
  submit is enabled.
