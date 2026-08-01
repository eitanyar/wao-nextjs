# Legal Package for Attorney Review — 2026-08-01

Everything outstanding in one batch. Base docs (ToS / Privacy / DPA) were reviewed against the **Ads Bot only**. WAO now sells four products under one umbrella; this package brings the other products' actual data/permission profiles up to the same standard, plus one loose item from the earlier subscription-billing review.

## 1. Base documents (already approved, Ads Bot scope)

- `terms-of-service.md`
- `privacy-policy.md`
- `data-processing-addendum.md`

These stay as the Ads Bot's terms. Their §4 (ToS) / §2 (Privacy) / §5 (DPA) permissions sections are specific to Google Ads read/write + GSC read-only + GCLID offline conversions — **do not assume they apply to the other products below.**

## 2. New: Site Bot permissions draft

`site-bot-permissions-draft.md` — replaces the same three sections for Site Bot's actual profile: Cloudflare Pages (deploy), Cloudflare DNS (subdomain), Gemini API (copy). No Google Ads/GSC, no GitHub, no domain-registrar purchase (site lives on `{slug}.wao.co.il` — client does not yet get a custom domain).

**Question:** does Cloudflare need its own DPA reference the way Google Cloud does?

## 3. New: GEO Bot permissions draft

`geo-bot-permissions-draft.md` — replaces the same three sections for GEO Bot's actual profile: Google Search Console (read-only), Gemini API. No Google Ads. Approval delivery is a plain `wa.me` link (pre-filled message), not a WhatsApp Business API integration.

**Question:** do we need explicit language stating the WhatsApp link is not a Meta data-processing relationship, so a client doesn't assume otherwise from the product name?

## 4. Content Bot — not yet built

No code exists for Content Bot yet (VISION.md only: ₪490/mo SEO content pipeline). No permissions draft to review — flagging so it isn't forgotten before that product launches.

## 5. Carried over from the subscription-billing legal copy (already approved 2026-07-30)

`subscription-legal-copy-final.md` itself needs no re-review — reference only, unchanged.

**Resolved (2026-08-01):** the legal entity name spelling was verified against the official עוסק מורשה certificate — confirmed correct as **"וואו שיווק באינטרנט"** throughout. No corrections needed in any document in this package.

## 6. Not in scope for this round

Payment provider selection (Takbull vs. Payme.io vs. Grow) is an operational/technical decision, not a legal one — the lawyer-approved cancellation/refund terms were written provider-agnostic and don't need rework regardless of which provider is picked.

---

**Files in this package:**

- `terms-of-service.md` (reference / unchanged)
- `privacy-policy.md` (reference / unchanged)
- `data-processing-addendum.md` (reference / unchanged)
- `subscription-legal-copy-final.md` (reference / unchanged)
- `site-bot-permissions-draft.md` (resolved — Cloudflare DPA question answered 2026-08-01)
- `geo-bot-permissions-draft.md` (resolved — wa.me/Meta question answered 2026-08-01)
- `legal-package-cover-note.md` (this file)
