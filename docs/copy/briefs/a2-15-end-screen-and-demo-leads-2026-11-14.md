# Brief: A2-15 video ad (Ads Bot): end screen + demo leads, 2026-11-14

**Ad:** a 17s vertical illustrated ad. Story: the owner runs a tasting stall at the shuk. Everyone samples on his account and brings friends; the crowd grows and the till stays empty. Then the real Ads Bot leads screen, where he marks one enquiry as real. Then the end screen. Nimrod says only "בוט מודעות." over it. Sound may be off.

**Voice, already recorded (don't change):**
- הקמפיין שלך הוא דוכן טעימות בשוק, וכולם טועמים על חשבונך ומביאים חברים.
- הקהל גדל, הקופה ריקה.
- בוט מודעות מביא לך קונים, לא טועמים, והקופה שלך סוף סוף מתמלאת.
- בוט מודעות.

**Reader:** an Israeli one-man tradesman who already pays, or has paid, for Google Ads and got clicks without jobs. He's scrolling on his phone.

**Where the click lands:** https://www.wao.co.il/google-ads. First screen:
- H1 «פרסום בגוגל שרודף אחרי פניות אמיתיות, לא אחרי קליקים»
- primary button «שיחה של 30 דקות עם איתן — חינם» (it names the founder, and ads must NOT name the founder)
- secondary button «לראות דמו חינם», which opens a free demo: he fills a short questionnaire and sees his ad and landing page before paying
- note «בלי התחייבות, עם הסכם כתוב»
- price in the subhead: 249 ₪ + מע״מ בחודש

**Deliver JSON:**
1. `stamp`: one short line above the button. It must be true and must match something on the landing page.
2. `cta`: button text. Prefer byte-exact «לראות דמו חינם» for message match, unless you can say why not. Never the founder-call button.
3. `price_line`: optional. One line with the price, OR null if you think price on the end card hurts. Explain either way; Eitan decides.
4. `url_line`: confirm wao.co.il/google-ads.
5. `banner`: the mid-ad banner over line 2 (~6–8s). Must be a strict, same-order subset of the spoken words (Noa's rule).
6. `demo_leads`: four fictional enquiries for the real leads screen. Columns: name, source, real-or-not. They belong to «יוסי אינסטלטור ברעננה», a plumber.
   - Each `name` is how the enquiry appears in the list (e.g. a first name plus surname initial, or a short description if that's how people show up). Pick what looks most real.
   - Exactly ONE is a real job (leak/emergency), marked real on screen.
   - Three are clickers: a student asking how to fix it himself, a job-seeker, a price-shopper. Marked not real.
   - No phone numbers from you; the engineer masks them.
   - Names must be clearly fictional and common, never a real public figure.
7. `why`: one line per field.

**Facts and limits:**
- Ads Bot = ₪249 + VAT/month. A new Google Ads account built from scratch, in his own name. Optimises on leads he marks as real. No commitment.
- No founder name.
- Everything must be true per docs/missions/claims-ledger-2026-11-12.md.
- Sell; don't hedge.
