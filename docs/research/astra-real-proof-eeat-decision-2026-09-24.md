# Astra Real Proof and Helpful Content Decision — 2026-09-24

## Decision

ADOPT a real-accountability and real-source model. Remove the fictional `DemoPanel` from both the hero and the current proof section. Use the existing approved `/eitan-yariv.avif` asset in the hero as accountable-owner proof, then place Eitan-provided WAO customer-recommendations video `zrgqx7OOtcc` in the first section after the hero through a click-to-load, privacy-enhanced `youtube-nocookie.com` iframe. Do not autoplay, download, crop, cache, or republish the YouTube thumbnail or video frames.

ADOPT a short practical decision section immediately after the video proof and before the existing path cards. Its job is to help a busy Israeli service-business owner choose one starting path without treating both as mandatory. Place a factual Google Partner trust row with this real-proof/E-E-A-T content, using an official locally stored badge linked to the verified directory entry. State the directory's non-endorsement boundary and do not turn certification coverage into an outcome claim.

1. Choose the Google Ads path when the immediate need is reaching people already searching for the service. Keep the existing primary destination `/google-ads/onboarding` and provide `/google-ads` only as a supporting details route.
2. Choose the site/local-presence path when the immediate need is an owned website and clearer local presence. Keep the existing start destination `/site-bot/start` and supporting details route `/site-bot`.
3. If the visitor is unsure, direct him to compare the two needs and contact WAO rather than inventing a third offer.

Identify Eitan Yariv as the accountable professional reviewer using only repository-proven facts: founder of WAO and marketing/Google Ads consultant. Link the reviewer identity to `/about`. Do not add unsupported experience totals, client counts, ROI, rankings, outcomes, or testimonial quotations.

## Observed Facts

### Repository facts

- `src/components/home/AstraHome.tsx` defines `DemoPanel` and renders it twice: once in the hero and once in `#proof`.
- The current copy bundle labels that panel as a fictional business and expressly says it is not a real client or real result.
- The homepage currently preserves one H1, the existing title value, the hero eyebrow, two-path destinations, and the existing section order.
- `/eitan-yariv.avif` exists in `public/` and is already rendered by the homepage people section.
- The approved copy identifies Eitan Yariv as WAO's founder and as a marketing/Google Ads consultant, and links the people CTA to `/about`.
- Real supporting routes exist for `/google-ads`, `/google-ads/onboarding`, `/site-bot`, `/site-bot/start`, `/about`, and `/contact#contact-form`.
- Existing independent evidence accepted the implementation's desktop structure/build/tests and preserved mobile observations for one H1, no horizontal overflow, and no console/page errors. The later mismatch was caused by an incorrect verifier selector contract, not by the product section IDs.
- Next.js 16 documentation supports external video through an `<iframe>` and calls out `title`, `loading`, `allowFullScreen`, and optional `sandbox` as relevant attributes. Its image documentation requires meaningful `alt` text, responsive `sizes` for `fill`, and a positioned parent for filled images.
- `src/app/(app)/about/page.tsx` contains the existing `Organization` JSON-LD object with `@id` `https://www.wao.co.il/#org`. That Organization object has no `sameAs`; the nested founder Person has a separate LinkedIn `sameAs`, so adding the verified company directory URL at Organization level creates no observed duplicate or conflict.

### Supplied-source facts

YouTube oEmbed retrieved on 2026-09-24 for `https://www.youtube.com/watch?v=zrgqx7OOtcc` reports:

- video ID: `zrgqx7OOtcc`
- title: customer recommendations about WAO internet marketing (Hebrew title supplied by oEmbed)
- channel/author: WAO's official channel at `https://www.youtube.com/@WaoIlMarketing`
- provider: YouTube
- thumbnail URL: `https://i.ytimg.com/vi/zrgqx7OOtcc/hqdefault.jpg`

The supplied thumbnail visibly shows one adult-presenting person. No minor is visible in the thumbnail, and no identity, quotation, result, or customer relationship can be inferred from the pixels alone.

The Google Partners directory page `https://partnersdirectory.withgoogle.com/partners/7030100386`, observed on 2026-09-24, identifies WAO Internet Marketing in Israel, displays Google Partner status, and lists Search and Display certification coverage. The page explicitly says directory listing is for reference and is not a Google endorsement. Its rendered badge uses the official asset URL `https://partnersdirectory.withgoogle.com/assets/badges/google-partner-26.min.svg` with alt text `Google Partner badge`.

## Unverified or Deliberately Excluded Assumptions

- No transcript is available in the accepted evidence. No spoken sentence may be quoted or paraphrased as testimony.
- The names, businesses, permissions, outcomes, and results of people appearing in the full video have not been independently verified.
- The full video has not been reviewed for every person/minor/privacy issue. The source manifest must record this boundary, and the final visual review plus Eitan's founder spot-check remain publication gates.
- The oEmbed title establishes the publisher's title, not the truth of any particular recommendation or commercial result.
- Existing `/about` claims beyond Eitan's name, founder role, and relevant professional role are not imported into this correction.
- Google Partner status and Search/Display certification coverage do not prove campaign performance, ranking, customer outcomes, ratings, awards, or endorsement.

## Production Model

### Hero

Replace the compact fictional demo with a real-owner accountability card using `/eitan-yariv.avif`. The card may contain only hash-approved new copy and repository-proven identity/role facts. It must not imply that Eitan is the customer shown in the recommendations video or that the image proves campaign outcomes.

### Real proof section

Keep `id="proof"` as the first section after the hero. Replace the second `DemoPanel` with:

- a clear label explaining that this is a WAO customer-recommendations video;
- a click-to-load consent control;
- no iframe, YouTube thumbnail, preconnect, or third-party request before the visitor activates the control;
- after activation, exactly `https://www.youtube-nocookie.com/embed/zrgqx7OOtcc` without autoplay parameters;
- an accessible iframe title, lazy loading, fullscreen support, restrictive permissions that omit autoplay, and an adjacent direct YouTube link;
- a `<noscript>` direct-link fallback;
- no invented quote, customer name, result, transcript, or performance claim.

### Helpful decision section

Add `id="choose_path"` immediately after `#proof` and before `#paths`. It should be concise and practical, not an SEO essay. It must:

- distinguish immediate search-demand acquisition from owned website/local-presence needs;
- keep the two existing conversion destinations unchanged;
- link to `/google-ads`, `/site-bot`, and `/about` as supporting routes;
- identify Eitan as the accountable reviewer without adding unsupported credentials;
- avoid keyword stuffing, a third product path, ranking promises, or universal recommendations.

Add a compact Partner trust row inside this section's accountable-review area. Render an official badge downloaded byte-for-byte from the observed Google-hosted badge asset, link it to the verified WAO directory URL, and include an adjacent non-endorsement disclosure. Accessible alt text may describe only the verified Google Partner status. Do not hotlink the badge, scrape or reproduce the directory page, or use the directory's screenshot/endcap imagery.

### Organization schema

Narrowly extend the existing Organization JSON-LD in `src/app/(app)/about/page.tsx`. Add `https://partnersdirectory.withgoogle.com/partners/7030100386` to Organization-level `sameAs` only after rechecking that the URL is not already present and no conflicting Organization definition owns the same identity. Do not alter the nested founder Person `sameAs`. Do not invent a `GooglePartner` schema type, `award`, rating, review, credential, endorsement, certification object, or outcome property.

## Source Manifest Decision

Create `docs/research/astra-real-proof-source-manifest.json` during engineering. It must be English and contain:

- schema version, source URL, video ID, privacy embed URL, and retrieval date;
- oEmbed-observed title, channel name, channel URL, provider, and thumbnail URL;
- Eitan as the source provider and the scope of authorization: homepage embedding of the supplied video;
- intended placements: the real proof section, with owner accountability separately in the hero;
- transcript status `unavailable` and a prohibition on quotes/paraphrased testimonial claims;
- media-use boundary: no download, crop, still extraction, local thumbnail copy, or republishing;
- thumbnail review: one adult-presenting person visible, no minor visible, identity not inferred;
- full-video people/minors review status: not independently reviewed; final visual review and Eitan's founder spot-check required before publication.
- verified Partner directory URL, observed WAO name/country/status, Search/Display coverage, observation date, and the directory's explicit non-endorsement boundary;
- official badge source URL, retrieval date, exact downloaded SHA-256, local path `/google-partner-badge.svg`, Eitan's owner authorization, permitted homepage placement/link, unmodified-byte status, and prohibition on hotlinking or reproducing directory screenshots/endcap imagery.

## Rejected Alternatives

- REJECT retaining either fictional `DemoPanel` near the top. The explicit disclaimer does not solve the owner's objection that the page feels like an artificial AI demo.
- REJECT using a copied YouTube thumbnail or extracted video still. That would create a separate asset-use decision not granted here.
- REJECT immediate iframe loading. Privacy-enhanced hosting reduces cookies but still creates a concealed third-party request before visitor action.
- REJECT testimonial quotations, customer names, outcome summaries, or case-study numbers derived from the video title, thumbnail, or unverified speech.
- REJECT moving the existing people section alone and calling it sufficient proof. It establishes accountability but does not use the owner-supplied customer-recommendations source.
- REJECT a long keyword-targeted E-E-A-T block. The useful content must help the visitor make the two-path decision.
- REJECT hotlinking the badge, copying the directory page, or using any unofficial/recreated badge.
- REJECT a new schema type or award/endorsement property for Partner status; only Organization-level `sameAs` is adopted.

## Release Boundary

This decision authorizes only the copy → Hebrew QA → engineer → independent runtime → independent visual chain described in the five companion handoffs. No child is dispatched by this task. No commit, push, deployment, publication, provider action, or live-client access is authorized. After local independent acceptance, Eitan must perform the founder-facing Hebrew and source-use spot-check before the orchestrator may use the separately granted production release authorization.
