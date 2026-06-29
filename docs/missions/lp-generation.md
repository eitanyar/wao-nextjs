# Mission: LP Generation Pipeline
*Owner: Adam | Last updated: 29.6.2026*

## What This Mission Produces
A personalized, A-class Hebrew landing page for each paying bot client — generated from the 30-field `CollectedData` schema, deployed to `/lp/[slug]` within ~30 seconds of payment.

## Decision Log (settled)
- **LP hosting Phase 1:** WAO subdomain path `/lp/[business-slug]` — no client DNS required
- **Graphics Phase 1:** Curated Unsplash/Pexels stock per vertical (Niv's manifest) + inline SVG icons
- **Generation timing:** Async with live status screen — POST to `/api/lp-generate` → SSE or polling → redirect to LP
- **Edit UI Phase 1:** None. Owner contacts WAO for changes. Revisit at Phase 2.

---

## Agent Effort Map (token budget per client LP generation)

| Agent | Task | Model | Effort |
|---|---|---|---|
| Tamar | Write LP copy from collectedData | Sonnet | MEDIUM — structured template, ~1,800 tokens |
| Noa | Hebrew QA on LP copy | Haiku | LOW — checklist, ~400 tokens |
| *(no agent)* | Vertical detection + theme assembly | Server code | ZERO — `verticalDetect.ts` |
| *(no agent)* | React LP render | Server code | ZERO — `LandingPage.tsx` |

**Total per-client token cost: ~2,200 tokens** (down from ~8,000 with open-ended agents)

---

## One-Time Build (run once by Dana → Niv → Eitan-Dev)
These produce static files. No agent invocation per client after this.

### Dana's Design Token Deliverable
File: `src/lib/lp/verticalThemes.ts`
8 `VerticalTheme` objects — colors, typography, badge style, CTA style, gradient recipes.

### Niv's Asset Manifest Deliverable
File: `src/lib/lp/verticalAssets.ts`
8 `VerticalAssets` objects — hero image paths/URLs, icon names, Unsplash query templates.

### Dror's LP Strategy Brief (per vertical)
*Dror already owns the below — his charter must be followed.*

LP section hierarchy per vertical type:

**Emergency Trades:** Hero (urgency CTA above fold) → Response time badge → Trust bar → Services → Reviews → Form → FAQ → About
**Skilled Trades:** Hero → Portfolio before/after → Trust bar → Services → Reviews → About → Form → FAQ
**Medical/Aesthetics:** Hero → Trust credentials → Before/after results → Services → Reviews → Form → About → FAQ
**Legal/Financial:** Hero → Authority bar (years + credentials) → Services → How it works → Reviews → Form → FAQ
**Events/Creative:** Hero (portfolio image) → Gallery → Services → Reviews → About → Trust bar → Form → FAQ
**Fitness/Wellness:** Hero (transformation) → Results promise → Services → How it works → Reviews → Form → About
**Beauty/Grooming:** Hero (portfolio) → Gallery → Services → Reviews → About → Trust bar → Form
**Remote/Professional:** Hero → Credentials bar → Services → How it works → Reviews → About → Form → FAQ

---

## Per-Client Pipeline (Post-Payment)

```
POST /api/lp-generate  {collectedData, slug}
  │
  ├─ verticalDetect(businessNiche) → verticalKey
  │
  ├─ [Tamar via Azure OpenAI]
  │   Input: collectedData (all 30 fields) + structured LP copy template
  │   Output: LPCopy JSON (heroHeadline, subhead, services[], faqItems[], etc.)
  │
  ├─ [Noa via Azure OpenAI] — QA pass on LPCopy
  │   Input: LPCopy JSON
  │   Output: corrected LPCopy JSON
  │
  ├─ Write to data/lps/[slug].json {collectedData, copy, vertical, createdAt}
  │
  └─ Return {success: true, url: `/lp/${slug}`}
```

---

## File Map

```
src/
  lib/lp/
    verticalThemes.ts    ← Dana's output (DONE)
    verticalDetect.ts    ← (DONE)
    verticalAssets.ts    ← Niv's output (DONE)
    lpCopyPrompt.ts      ← Tamar's structured prompt (DONE)
  components/lp/
    LandingPage.tsx      ← Eitan-Dev (DONE)
  app/
    (app)/lp/[slug]/
      page.tsx           ← Eitan-Dev (DONE)
    api/lp-generate/
      route.ts           ← Eitan-Dev (DONE)
data/
  lps/                   ← Runtime JSON store (one file per client)
```

---

## Tamar's LP Copy Template (MEDIUM effort — structured)

Input: full `CollectedData` object
Output: `LPCopy` JSON object with exactly these fields:

```
heroHeadline        — fear/pain hook from idealClientFear (max 60 chars)
heroSubheadline     — USP + guarantee promise (max 100 chars)
heroCta             — primary button text (based on contactMethod)
trustBarItems       — array of 3-4 short trust phrases
aboutBlurb          — 2 sentences, ownerName + yearsInField + personality
servicesSection     — headline + array of 4-6 service items with short descriptions
faqItems            — array of {q, a} from faqQuestions (2-3 items)
guaranteeBlock      — 1-2 sentences from guarantee field
reviewFeatured      — exact text from reviewQuote (no editing)
reviewContext       — "X כוכבים | Y ביקורות בגוגל" from starRating
responseTimeBadge   — from responseTime (e.g. "מגיע תוך 20 דקות") or null
scarcityLine        — from capacityUnit if event-based, else null
formHeadline        — CTA to leave details (urgency-aware)
stickyBarLine       — 4-word max above sticky buttons
```

Noa QA checklist for LP copy:
- [ ] No doubled spaces
- [ ] No straight quotes — only Hebrew gershayim (״) and geresh (׳)
- [ ] Em-dash ( — ) with single space each side
- [ ] No calques from English ("עשה לייק", "תן שר", "זה פשוט")
- [ ] heroHeadline ends with active verb or noun, not "..."
- [ ] All Hebrew verbs in singular male (אתה form) — never plural
- [ ] Phone number appears in LTR context if displayed in copy
