# Amit: WhatsApp nurture sequence, compliance and channel review (2026-11-12)

Saved by Adam from Amit's hand-back (sources read 2026-11-12). **Verdict: unacceptable as things stand. Nothing can be sent.** The copy is mostly fine; the infrastructure is missing.

## Blockers (code)
1. The demo collects no phone number and no consent: onboarding/page.tsx:166-170 uses DEMO_PROFILE, and every input is disabled in demo mode. /google-ads has only a tel: link.
2. No inbound WhatsApp webhook (no hub.challenge handler in src/), so opt-out replies reach nobody.
3. The only sending number (WHATSAPP_CLOUD_PHONE_NUMBER_ID) also sends the product's lead first-responses (lead-response.ts). Marketing on it endangers the product channel.

## Required before any send
- Every message STARTS with "פרסומת" (§30A(e)).
- Sender identification in every message: WAO + postal address + contact.
- Opt-out line: "Want to stop? Reply 'stop' (or just 'די')…", plus Meta's "Stop promotions" button. Code treats di / hasser / stop / the button as opt-out and halts immediately.
- All five are pre-approved MARKETING templates. Never Utility: Meta re-categorises, and repeat misuse can flip our utility templates, which would hit lead first-response. Links are URL buttons with fixed domains.
- A dedicated WAO marketing number.
- Consent: a separate, unticked checkbox next to a new mobile field after the demo. English intent: "I agree to receive marketing messages from WAO (WAO Digital Marketing Ltd.) on WhatsApp to this number: tips and updates about Ads Bot, up to about five messages over the next few weeks. I can stop at any time by replying 'stop'. Details per the privacy policy." Store the timestamp, wording version, source page and number. Not bundled with PrivacyConsent.tsx.
- Privacy (Amendment 13, in force 14.8.2025): collect the mobile only; add a privacy-policy section naming Meta/WhatsApp as a service provider (data abroad); delete the nurture record about 90 days after the last message; keep a minimal opt-out list. Lawyer: check whether the direct-mail section (17F) adds per-message requirements.
- Cadence: days 0, 4, 9, 15, 22; Sun–Thu 07:00–08:00 or 19:30–21:00; never Friday afternoon, Shabbat or holidays. Stop on opt-out or signup; pause on any reply and hand to support; drop messages 4–5 if 1–3 got no engagement. Handle Meta per-user cap error 131049 (no retry loop).
- Copy truth fixes: msg 4, no "₪15" (per-trade ceiling); msg 5, no "every enquiry" (enquiries from your page; a real enquiry you mark goes back tied to its click).

## Build vs buy
Build (sendWhatsAppTemplate exists): consent form + proof, inbound webhook + opt-out handling, opt-out list check, scheduler with stop rules and quiet hours, 131049 handling, second number ID. About 2 engineer days.

## Adam's recommendation (pending Eitan)
Park the WhatsApp nurture programme until after the 29.11 launch. Tamar fixes msgs 4–5 and adds the "פרסומת" opening, sender footer and opt-out line, so the copy is ready. Consider email first through the existing exit opt-in (needs its own check).

Sources: Communications Law §30A (Wikisource); Chen v. Rosental 2025; Leibin v. Bezeq Nov 2025; Shreiber v. Hot Mobile 2026; WhatsApp Business Messaging Policy (23 Sep 2026); Meta opt-in, template categories, pricing (1 Oct 2026 changes) and per-user limits (17 Jun 2026); Amendment 13 (Vixio, Chambers 2026, PPA minimisation opinion).
