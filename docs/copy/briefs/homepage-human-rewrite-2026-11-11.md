# Brief: WAO homepage — human rewrite pass (2026-11-11)

**Reader:** a hands-on Israeli micro-business owner (plumber, electrician, AC tech, beautician…), singular male, busy, ROI-minded, allergic to jargon and to AI-sounding copy. Voice target: the /site-bot/audit exemplar (loaded) — blunt, concrete, Sabra: short bad news, the consequence, the next step; one "you were there" scene per path card.

**Job:** rewrite the RENDERED homepage strings so the page reads like a person who knows the trade wrote it. Noa's full review (below) lists every problem and her suggested lines — use them as input, not as final copy; you own the wording and the angle. Apply the standing writing-upgrade rules.

**Hard keeps (do not change):** hero eyebrow, hero h1 and the page title (SEO anchors); "פרסום בגוגל" as the Google-ads card head term; FAQ Q2 and the card CTA "תראה לי מודעה לעסק שלי"; every claim boundary in the files (no invented results, rankings, quotes, numbers, or characterising the testimonial video); singular masculine address. Never mention or imply call tracking / knowing which ad brought a call.

**Facts you may use (settled):**
- Founder: every campaign and page that leaves WAO passes under Eitan Yariv's eyes; in digital marketing since 2006.
- FAQ "when will inquiries start": with search ads, inquiries can start within a few days, once Google approves the ads (usually within a business day); the first weeks are a learning period so the flow starts uneven; how many depends on local demand, competition and budget. The Google Business Profile usually starts bringing calls within the first months; the website's own Google rankings build more slowly, typically paying off around months 6–12. Use "usually/typically", no specific week, profile before website.
- FAQ "commitment / long-term contract": no minimum commitment, month to month, cancel online any time.
- The website card's button opens a FREE check of how his business shows up on Google (/site-bot/audit); its text link goes to the website product page.
- The Google-ads CTAs open a demo: an ad + a landing page for his business, seen before paying anything.

**Scope:** only keys that render (Noa's review names them, in render order). Cut `paths.intro` (return its new value as ""). Reduce the four demo CTA labels to one or two consistent labels. Fix all en-dashes (– → — or rephrase). Remove repeated "מי שמחפש אותך" and "כיוון". The footer blurb is built from `low_price.lines[0]`, `low_price.lines[1]` and `people.intro` — rewrite those three so the joined blurb reads as one natural paragraph.

**Output:** JSON patches only. Each `old` copied byte-for-byte from the file text below (a whole JSON string value, without the surrounding quotes), `new` = replacement. Never output ASCII double quotes inside Hebrew; use gershayim ״ / geresh ׳.

=== NOA'S REVIEW (docs/copy/reviews/homepage-noa-full-proofread-2026-11-11.md) ===
# Homepage full proofread — Noa (language-qa), 2026-11-11

First test of Noa's expanded role (full proofread + AI-signature removal + writing upgrades). Review only; nothing edited.
Tags: [RED] breaks meaning, [ORANGE] objective error, [YELLOW] style, [AI] AI tell.

## 1. Verdict
About 60% human. The h1, the card CTA "תראה לי מודעה לעסק שלי" and FAQ Q2 sound like a person. Everything else reads like copy written to fill section roles: abstract nouns (כיוון, נוכחות, מקום ברור ברשת), "מי שמחפש אותך / צריך למצוא אותך" four times, reveal colons and dashes, and no scene a plumber would recognise. No corruptions, no [RED].

Worst three:
1. `founder_authority.accountability_line` — repeats the name and role printed right above it; the rest is empty corporate talk.
2. FAQ Q5 answer — dodges the question; an ROI-minded owner reads that as hiding something.
3. `final_cta.body` — "כיוון ברור לצעד הבא" is generic and promises something the button doesn't deliver (it goes to an ad + landing-page demo).

## 2. Per section (render order)

**Header / nav**
- [YELLOW] One destination, four CTA labels: "תראה לי את המודעה שלי" (nav), "אני רוצה לראות הדגמה" (hero), "תראה לי מודעה לעסק שלי" (card), "קדימה, להדגמה" (final). Pick one or two; concrete מודעה beats abstract הדגמה.

**Hero**
- eyebrow + h1: SEO anchors, untouched. The h1 is the most human line on the page.
- [ORANGE] `hero.body`: en-dash "–" where house style is em-dash "—". Same in 5 more in `paths.*` (lines 88, 89, 90 ×2, 102) — 6 total, all in astra-authority-first-homepage-copy.json.
- [AI] `hero.body`: logic skips a step; "ב-WAO תראה הדגמה:" is a stiff reveal colon.
  - old: "אתה כל היום בעבודה – מי שמחפש שירות כמו שלך צריך למצוא אותך. ב-WAO תראה הדגמה: מודעה ודף נחיתה לעסק שלך."
  - suggested: "אתה כל היום אצל לקוחות, אין לך זמן לשווק. מי שמחפש עכשיו את השירות שלך בגוגל צריך להגיע אליך, לא למתחרה. תראה איך ייראו המודעה ודף הנחיתה שלך, לפני שמשלמים שקל."
  - why: names the missing link (no time) and the stake (competitor); "before paying" backed by the old supporting_line and demo_note.

**Proof (#proof)**
- [AI] `video_proof.heading` "סרטון ההמלצות של לקוחות WAO" describes the widget → "לקוחות WAO, במילים שלהם" (check against claim_boundaries, which forbid characterising the video).
- [YELLOW] `context_line` is "" and renders an empty `<p>` — engineer layout matter.
- [YELLOW] CTA grammar mixed across the page (infinitive / imperative / first person). One form per role.

**Paths (#paths)**
- [AI] Cut `paths.intro` entirely (repeats card headings, buzzword "נוכחות קבועה ברשת", repeats "לסדר").
- [ORANGE] `google_ads.heading`: "פרסום בגוגל – להגיע" → "פרסום בגוגל — להגיע". Keep "פרסום בגוגל" as head term.
- [AI] `google_ads.description`: "מודעה מדויקת שמה אותך מולו" is a calque; reveal-dash; generic funnel.
  - suggested: "מישהו באזור שלך מחפש עכשיו בגוגל את מה שאתה עושה. המודעה שלך מופיעה לו, הוא נכנס לדף שלך ומתקשר או משאיר פרטים."
- [ORANGE]+[AI] `demo_status`: two en-dashes; "יוצא לדרך" ceremonial, "מלחיצה" vague, "מקושרת למודעה" jargon.
  - suggested: "שום מודעה לא עולה לאוויר בלי האישור שלך. ותדע איזו מודעה הביאה כל פנייה, מטופס או משיחה."
  - **Fact flag:** older copy says call tracking is a paid add-on ("הרחבה… בתשלום נפרד"); this line suggests it's included. Confirm (Dror/Adam).
- [ORANGE]+[AI] `business_website.description`: en-dash between subject and predicate; "נותנים לעסק שלך מקום ברור ברשת:" abstract + reveal colon.
  - suggested: "שכן המליץ עליך, והלקוח בודק את השם שלך בגוגל. לא מצא אתר, טלפון ושעות? הוא מתקשר למישהו אחר."
- [YELLOW] Website card CTA goes to the free Google-profile check — make the bridge explicit. "עוד על האתר לעסק" → "עוד על אתר לעסק".
- [AI] `choosing_help.line`: "ונבחר יחד כיוון" consultant talk.
  - suggested: "לא בטוח מה מתאים לך? ספר לנו מה אתה עושה ואיפה, ונגיד לך מאיפה שווה להתחיל."

**People (#people)**
- [AI] `accountability_line`: deletion-only fix — cut "איתן יריב, מייסד WAO, ". Full rewrite needs facts:
  - old: "…עומד מאחורי הכיוון המקצועי של כל עבודה כאן."
  - suggested: "כל קמפיין ודף שיוצאים מ-WAO עוברים תחת העיניים שלי. אני בשיווק דיגיטלי מאז 2006." — only if Eitan confirms both facts ("2006" already live in the footer).
- [AI] `partner_proof.status_line` repeats the heading; "Search ו-Display" jargon.
  - suggested: "רשומים בספריית השותפים של גוגל, עם הסמכות לפרסום בחיפוש ולמודעות תצוגה."

**FAQ**
- [YELLOW] "זה בעיה?" vs normative "זו בעיה?" — colloquial acceptable in a question; Tamar's call.
- [AI] Q3: "בשביל זה אנחנו כאן" is the agency boast the exemplar lists under "do not imitate"; cut "אתה לא צריך ללמוד מקצוע נוסף." → "להפך. אתה איש המקצוע, אנחנו מטפלים בשיווק."
- [AI] Q1: stock opener "בהחלט", reveal-dash; "מסלול המודעות" appears nowhere else. → "כן. המודעות יכולות להביא לקוחות לאתר הקיים שלך, או לדף נחיתה חדש וממוקד יותר."
- [AI] Q4: five-item hedge list, "תלוי" twice, "נוכחות אורגנית" jargon. → "במודעות, פניות יכולות להגיע כבר מהיום שהקמפיין עולה. כמה, תלוי בביקוש באזור, בתחרות ובתקציב. אתר ונוכחות מקומית בונים לקוחות לאט, לאורך חודשים." (Dror + Yonatan verify timing.)
- [ORANGE] Q5 question: "חוזה ארוך טווח" → "חוזה לטווח ארוך".
- [AI] Q5 answer is a non-answer; Tamar needs the real terms from Adam. Don't invent.

**Final CTA**
- [AI] `final_cta.body` → "ספר לנו מה אתה עושה ובאיזה אזור. תקבל מודעה ודף נחיתה לעסק שלך, לראות לפני שמחליטים."
- [YELLOW] heading "איך זה ייראה אצלך?" — "זה" refers to nothing; CTA "קדימה, להדגמה" stiff.

**Footer**
- [AI] Blurb (joins `low_price.lines[0]`, `[1]`, `people.intro`): "אמיתי" ×2, "ניסיון" ×2, sentence 3 restates 1, "המערכת" refers to nothing.
  - suggested: "אנשי השיווק של WAO, בשיווק דיגיטלי מאז 2006, מובילים את העבודה. סוכני AI עושים חלק גדול מהמחקר, מהכתיבה ומההקמה."
- [YELLOW] "מה מקבלים ואיך ממשיכים?" and "תראה לי את המודעה שלי" sit in a list of service names, out of context.
- [ORANGE] Footer.tsx hard-coded `'מערכת "מה עובד" (CRM)'` ASCII quotes → `'מערכת ״מה עובד״ (CRM)'`.

**SEO anchors (flag only):** eyebrow, h1, title untouched. Title ends in Hebrew (bidi-safe), ~55 chars.

## 3. Proposed writing upgrades for waocopy (await approval)
1. Never restate in body text what a heading, label or the neighbouring element already says.
2. Don't reuse the same key phrase more than twice per page. Vary it or cut it.
3. Replace abstract nouns (direction, presence, place online) with a concrete moment the reader has lived.
4. Every promise must match what the linked button actually delivers.
5. Use colons and dashes only for real lists or asides, not to set up a reveal, and at most once per section.
6. An FAQ answer opens with the direct answer (yes, no, a number, a time), then one reason. No stock openers, and no "it depends on X, Y, Z" lists.
7. Never answer a question about terms or price by sending the reader elsewhere. State the term, or ask for it in the brief.
8. One verb form per CTA role across a page. Prefer concrete nouns over category words in button labels.
9. No reassurance words like "real/genuine" unless a specific fact follows.
10. Translate English idioms of position or motion into how an Israeli tradesman would say it aloud.

## 4. Brief for Tamar
Rewrite the rendered homepage strings in both JSON files (keys above), plus the footer blurb's three source lines. Voice: the /site-bot/audit exemplar — short bad news, then the consequence, then the next step, plus one "you were there" scene per path card. Cut `paths.intro`; replace the name/role echo in the founder line; give FAQ Q5 a real answer (terms from Adam); align `final_cta.body` with the ad + landing-page demo; reduce the four CTA labels to one or two; replace the six en-dashes; remove repeated "מי שמחפש אותך" and "כיוון". Keep h1, eyebrow, title (SEO anchors), "פרסום בגוגל" as card head term, every claim boundary (no invented results, rankings, quotes or video characterisation), singular masculine, FAQ Q2 and the card CTA. Open facts first: call/lead attribution included in `demo_status`? (Dror/Adam); FAQ Q4 timing (Dror/Yonatan); founder-line facts (Eitan). After the rewrite → Noa correctness pass → contract test + approved-copy record updated.

Files: src/content/astra-authority-first-homepage-copy.json, src/content/astra-homepage-copy.json, src/components/Footer.tsx.

## 5. Facts settled for the rewrite (2026-11-11)
- **Founder line (Eitan):** true — every campaign and page that leaves WAO passes under Eitan's eyes; in digital marketing since 2006.
- **Call/lead attribution (Eitan):** a paid add-on and not significant → never mention or imply it on the homepage (drop the attribution sentence in Noa's `demo_status` suggestion).
- **FAQ Q4, ads half (Dror, web-checked 2026-11-11):** with search ads, inquiries can start within a few days, once Google approves the ads (usually within a business day); the first weeks are a learning period, so the flow starts uneven; volume depends on local demand, competition and budget. Don't say "from day one".
- **FAQ Q4, website half (Yonatan):** the Google Business Profile usually starts bringing calls within the first months; the website's own Google rankings build more slowly, typically paying off around months 6–12. "Usually/typically", no specific week, profile first.
- **FAQ Q5 (commitment, Eitan CONFIRMED):** no minimum commitment, month to month, cancel online any time (matches the lawyer-approved subscription copy, docs/legal/subscription-legal-copy-final.md).

=== FILE: src/content/astra-authority-first-homepage-copy.json ===
{
  "metadata": {
    "artifact": "astra-authority-first-homepage-copy",
    "task_id": "2026-09-27_002",
    "kanban_task": "t_00b6e864",
    "status": "draft-owner-review",
    "authoring_model": "qwen3.8-max",
    "language": "he-IL",
    "scope": "Replacement top-page strings only; lower-page sections and historical copy remain untouched.",
    "seo_anchors_preserved_by_reference": {
      "title": "docs/copy/astra-homepage-copy.json#/metadata/seo/homepage_title_tag_current",
      "h1_line1": "docs/copy/astra-homepage-copy.json#/hero/h1_line1",
      "h1_line2": "docs/copy/astra-homepage-copy.json#/hero/h1_line2",
      "hero_eyebrow": "docs/copy/astra-homepage-copy.json#/hero/eyebrow"
    },
    "section_roles": {
      "hero": "Recognize the busy tradesman and make one clear primary invitation; no offer comparison or founder proof.",
      "founder_authority": "Identify the accountable human once at #people; replace the later founder biography.",
      "video_proof": "Customer voice only at #proof, with an immediately available non-autoplay player and direct fallback.",
      "partner_proof": "Compact, directory-verifiable credential near the founder; no performance implication.",
      "paths": "One decision at #paths, replacing both #choose_path and the older paths explanation.",
      "final_cta": "Invite the next action without repeating the hero body or explaining the two paths again."
    },
    "no_repeat_rule": "Render each role once: no duplicate founder biography, path cards, video introduction, Partner status or hero promise. Do not render the older decision_guide, people biography, click-to-load copy, or duplicate video figcaption.",
    "exact_destinations": {
      "google_ads_primary": "/google-ads/onboarding",
      "google_ads_supporting": "/google-ads",
      "site_bot_primary": "/site-bot/start",
      "site_bot_supporting": "/site-bot",
      "founder_about": "/about",
      "choosing_help_only": "/contact#contact-form",
      "founder_photo": "/eitan-yariv.avif",
      "video_embed": "https://www.youtube-nocookie.com/embed/zrgqx7OOtcc",
      "video_direct": "https://www.youtube.com/watch?v=zrgqx7OOtcc",
      "partner_directory": "https://partnersdirectory.withgoogle.com/partners/7030100386",
      "partner_badge": "/google-partner-badge.svg"
    },
    "claim_boundaries": [
      "Do not invent customer identities, quotations, video contents, results, ratings, awards, lead counts, revenue, rankings, ROI, experience totals, certifications or Google endorsement.",
      "Video provenance is publisher-supplied; no quotation, paraphrase, thumbnail copying, still extraction or characterization of anyone in the video.",
      "Partner status and Search/Display certification coverage are directory observations, not a recommendation or performance promise.",
      "The Google Ads onboarding preview is a demo, not live advertising; ad spend and service terms are not invented here.",
      "A business website/local presence does not include ongoing Google Business Profile management by default.",
      "Do not publish or integrate before material Hebrew QA and subsequent founder/source-use approval."
    ]
  },
  "hero": {
    "body": "אתה כל היום בעבודה – מי שמחפש שירות כמו שלך צריך למצוא אותך. ב-WAO תראה הדגמה: מודעה ודף נחיתה לעסק שלך.",
    "primary_cta": {
      "label": "אני רוצה לראות הדגמה",
      "href": "/google-ads/onboarding"
    }
  },
  "founder_authority": {
    "name": "איתן יריב",
    "role": "מייסד WAO, יועץ שיווק ופרסום בגוגל",
    "accountability_line": "איתן יריב, מייסד WAO, עומד מאחורי הכיוון המקצועי של כל עבודה כאן.",
    "photo_alt": "איתן יריב, מייסד WAO",
    "about_link": {
      "label": "להכיר את איתן",
      "href": "/about"
    }
  },
  "video_proof": {
    "heading": "סרטון ההמלצות של לקוחות WAO",
    "context_line": "",
    "iframe_title": "סרטון המלצות לקוחות WAO ביוטיוב",
    "embed_src": "https://www.youtube-nocookie.com/embed/zrgqx7OOtcc",
    "direct_link": {
      "label": "לצפות בסרטון ביוטיוב",
      "href": "https://www.youtube.com/watch?v=zrgqx7OOtcc"
    }
  },
  "partner_proof": {
    "heading": "WAO היא Google Partner",
    "status_line": "WAO רשומה בספריית השותפים הרשמית של גוגל כ-Google Partner, עם הסמכות Search ו-Display.",
    "badge_alt": "תג Google Partner של WAO",
    "badge_src": "/google-partner-badge.svg",
    "directory_link": {
      "label": "לבדוק בספריית השותפים",
      "href": "https://partnersdirectory.withgoogle.com/partners/7030100386"
    }
  },
  "paths": {
    "heading": "מה כדאי לסדר קודם?",
    "intro": "יש שתי דרכים להתחיל: להגיע עכשיו למי שמחפש אותך, או לסדר לעסק נוכחות קבועה ברשת.",
    "google_ads": {
      "heading": "פרסום בגוגל – להגיע למי שכבר מחפש אותך",
      "description": "כשלקוח מחפש בגוגל שירות כמו שלך, מודעה מדויקת שמה אותך מולו. הוא נכנס לדף נחיתה ברור, רואה מה אתה מציע – ומשאיר פנייה.",
      "demo_status": "פרסום חי יוצא לדרך רק כשתחליט. כל פנייה – מהטופס או מלחיצה – מקושרת למודעה שהביאה אותה.",
      "primary_cta": {
        "label": "תראה לי מודעה לעסק שלי",
        "href": "/google-ads/onboarding"
      },
      "supporting_link": {
        "label": "עוד על פרסום בגוגל",
        "href": "/google-ads"
      }
    },
    "business_website": {
      "heading": "אתר לעסק ונוכחות מקומית",
      "description": "מי ששמע עליך ורוצה לבדוק – צריך למצוא אותך בקלות. אתר מסודר ונוכחות מקומית נותנים לעסק שלך מקום ברור ברשת: מה אתה עושה, ואיך מגיעים אליך.",
      "primary_cta": {
        "label": "לבדוק את העסק שלי בגוגל — חינם",
        "href": "/site-bot/audit"
      },
      "supporting_link": {
        "label": "עוד על האתר לעסק",
        "href": "/site-bot"
      }
    },
    "choosing_help": {
      "line": "מתלבט במה להתחיל? ספר לנו על העסק שלך, ונבחר יחד כיוון.",
      "link": {
        "label": "נדבר על העסק שלי",
        "href": "/contact#contact-form"
      }
    }
  },
  "final_cta": {
    "heading": "איך זה ייראה אצלך?",
    "body": "תן לנו כמה מילים על העסק שלך, ותקבל כיוון ברור לצעד הבא.",
    "primary_cta": {
      "label": "קדימה, להדגמה",
      "href": "/google-ads/onboarding"
    }
  }
}

=== FILE: src/content/astra-homepage-copy.json ===
{
  "metadata": {
    "artifact": "astra-homepage-copy",
    "task_id": "2026-09-22_002",
    "kanban_task": "t_5ec6ef7d",
    "direction": "Astra homepage redesign (owner-approved)",
    "version": "1.0.0",
    "created_at": "2026-09-22",
    "language": "he-IL",
    "audience": "בעלי מקצוע ונותני שירות בישראל — בבית הלקוח, בקליניקה, בסטודיו, במשרד או מרחוק",
    "voice": "לשון יחיד זכר, עברית סברית ישירה ומכבדת; משפטים עד כ-15 מילים; קריאת העידוד הסלנגית מופיעה פעם אחת בלבד בקופי המרונדר (proof.cta)",
    "section_order": [
      "hero",
      "proof",
      "paths",
      "low_price",
      "lead_handling",
      "ai_search",
      "people",
      "faq",
      "final_cta"
    ],
    "seo": {
      "homepage_title_tag_current": "שיווק דיגיטלי ש-AI מריץ — טוב יותר מסוכנות פרסום | WAO",
      "h1_policy": "H1 אחד בלבד; שתי השורות הן עוגן שאושר על ידי הבעלים, עם שבירת שורה ויזואלית ביניהן",
      "title_tag_policy": "תג ה-title הקיים נשמר עד אישור SEO מפורש — ראו artifact ההמלצות"
    },
    "truth_constraints": [
      "ההטמעה של Ads פועלת כברירת מחדל במצב בדיקה/הדגמה פנימי ו-Live נעול; הקופי מסמן מצב הדגמה ואינו מרמז על הפעלה חיה לציבור",
      "מחירי Ads החדשים (9.90 הקמה, חודש ראשון חינם, 249 לחודש) אינם מרונדרים בהומפייג' — הם סותרים את דף /google-ads הפומבי שמציג ניהול מ-1,500 לחודש; ראו המלצות",
      "Site Bot: רק ניסיון ₪9.90 ועמוד בית חי אחד לפני התחייבות נוספת; תנאי המשך, מע״מ, חיוב, אחסון והחזרים לא הומצאו",
      "לא נטען מספר שאלות כלשהו; ה-intake מגדיר 14 שלבים וכתובת מדלגת מותנית",
      "Google Business ₪149 לחודש ו-Maoved מ-₪160 לחודש מוצגות כהרחבות אופציונליות בלבד",
      "אין המלצות לקוחות, מונים, דירוגים, הבטחות, ROI, מספרי לקוחות, הבטחות החזר או תוצאות אורגניות מיידיות",
      "פרופש מאושר אחד בלבד: /eitan-yariv.avif; כל הדגמה אחרת מסומנת במפורש כהדגמה בדיונית"
    ]
  },
  "navigation": {
    "separator_display": " · ",
    "links": [
      { "label": "פרסום בגוגל", "href": "/google-ads" },
      { "label": "אתר ונוכחות מקומית", "href": "/site-bot" },
      { "label": "מי אנחנו", "href": "/about" }
    ],
    "primary_cta": { "label": "תראה לי את המודעה שלי", "href": "/google-ads/onboarding" },
    "help_link": { "label": "יש שאלה? דבר איתנו", "href": "/contact#contact-form" },
    "footer_move_note": "בלוג, הכשרות ושירותים משלימים עוברים לנווט הראשי לפוטר — לא נמחקים, רק יורדים מהניווט הראשי"
  },
  "hero": {
    "eyebrow": "שיווק בגוגל לבעלי מקצוע ונותני שירות",
    "h1_line1": "יותר לקוחות מגוגל.",
    "h1_line2": "פחות שיווק על הראש.",
    "body": "כשמישהו מחפש את השירות שלך, כדאי שימצא עסק שנראה בדיוק בשבילו. WAO בונה לך את הדרך אליו: מודעות ודף נחיתה, או אתר ונוכחות מקומית בגוגל. מתחילים פשוט, במחיר שמתאים גם לעסק קטן.",
    "primary_cta": { "label": "תראה לי את המודעה שלי", "href": "/google-ads/onboarding" },
    "supporting_line": "מודעה ודף נחיתה לעסק שלך, בתצוגה מקדימה לפני שמתחייבים לשלם.",
    "demo_note": "התצוגה המקדימה פועלת כרגע במצב הדגמה — בלי פרסום חי ובלי חיוב.",
    "secondary_cta": { "label": "רוצה לבנות נוכחות מקומית? מתחילים כאן", "href": "/site-bot/start" },
    "mechanism_line": "מנהל שיווק מבוסס AI, עם הניסיון והאנשים של WAO מאחוריו."
  },
  "proof": {
    "heading": "בוא נראה איך העסק שלך יכול להיראות בגוגל.",
    "explain_lines": [
      "מספרים לנו מה אתה עושה, באיזה אזור ואיזה לקוחות אתה רוצה.",
      "WAO מחדדת את ההצעה שלך ובונה מודעה ודף נחיתה תואמים.",
      "אתה רואה את הכיוון על העסק שלך, לפני כל החלטה."
    ],
    "demo_label": "הדגמה: עסק בדיוני אחד עם מודעה ודף נחיתה תואמים. לא לקוח אמיתי ולא תוצאה אמיתית.",
    "cta": { "label": "יאללה, תראה לי", "href": "/google-ads/onboarding" },
    "asset_guidance": "No approved matching product asset exists. Engineer builds a clean UI demonstration — ad preview plus landing-page preview for the same fictional business — visibly labelled with demo_label. Never fabricate screenshots, leads, rankings, or results, and never style demo data as a real customer result."
  },
  "paths": {
    "heading": "מאיפה מביאים את הלקוח הבא שלך?",
    "intro": "שני מסלולים נפרדים. בוחרים את המתאים לך עכשיו — לא חייבים את שניהם.",
    "path_ads": {
      "eyebrow": "מסלול 1: מודעות בגוגל",
      "need": "מתאים לך אם אתה רוצה להגיע לאנשים שמחפשים אותך עכשיו.",
      "deliverable": "מודעת חיפוש ממוקדת בגוגל ודף נחיתה — סביב השירות, האזור והסיבה לבחור בך.",
      "emphasis": "קודם תראה איך זה נראה על העסק שלך.",
      "status_note": "כרגע במצב הדגמה: רואים את המודעה ואת דף הנחיתה על העסק שלך. בלי פרסום חי ובלי חיוב.",
      "cta": { "label": "תראה לי את המודעה שלי", "href": "/google-ads/onboarding" },
      "pricing_guidance": "Rendered pricing intentionally omitted. Owner-reported terms (9.90 setup, first management month free, 249 per month, media budget separate) conflict with the public /google-ads page showing legacy 1,500 per month management. Resolve the conflict before any Ads price appears on the homepage."
    },
    "path_local": {
      "eyebrow": "מסלול 2: אתר ונוכחות מקומית",
      "need": "מתאים לך אם חשוב לך שיותר לקוחות מקומיים יכירו את העסק.",
      "deliverable": "אתר שמציג את המקצוע, השירותים ואזור השירות — ואיתו חיזוק נוכחות מקומית לפי המסלול.",
      "emphasis": "יש לך עסק טוב. בוא ניתן לו נוכחות בהתאם.",
      "trial_line": "מתחילים בניסיון של ₪9.90: עמוד בית חי אחד, בכתובת של WAO, לפני כל התחייבות נוספת.",
      "continuation_line": "מה מקבלים אחר כך ואיך ממשיכים? בדף השירות תראה את האפשרויות הקיימות לפני שתחליט.",
      "not_included_line": "ניהול שוטף של פרופיל גוגל עסקי הוא שירות נפרד — לא כלול במסלול הזה.",
      "cta": { "label": "בוא נבנה את האתר שלי", "href": "/site-bot/start" },
      "details_link": { "label": "מה מקבלים ואיך ממשיכים?", "href": "/site-bot" },
      "intake_guidance": "Do not state a question count anywhere. The intake defines 14 steps and the address step is conditionally skipped, so any fixed number is wrong in at least one flow."
    }
  },
  "low_price": {
    "heading": "איך זה עובד במחיר שמתאים לעסק קטן?",
    "lines": [
      "את השיטה מובילים אנשי השיווק של WAO, עם ניסיון אמיתי בשטח.",
      "סוכני AI מבצעים חלק גדול מהמחקר, מהכתיבה ומההקמה.",
      "ככה מתאפשר מחיר כניסה נמוך, בלי לוותר על המקצועיות."
    ],
    "human_seam_line": "התוצאה עוברת בדיקה אנושית לפני שאתה רואה אותה, וצוות WAO זמין בשאלות. חשוב שתדע: זה לא מנהל שיווק אישי צמוד.",
    "ai_once_guidance": "AI is explained once, here and in hero.mechanism_line, as capability and affordability only. It is never the hero subject and no other section reintroduces it as an offer."
  },
  "lead_handling": {
    "heading": "ומה קורה כשהטלפון מתחיל לצלצל?",
    "lines": [
      "הפניות מגיעות אליך ישירות — לטלפון, לוואטסאפ או לטופס.",
      "רוצה לדעת איזו מודעה הביאה כל שיחה? יש לנו הרחבה מתאימה.",
      "מעקב שיחות וניהול לידים פשוט — הרחבות לפי המסלול, בתשלום נפרד.",
      "מערכת הלידים שלנו, ״מה עובד״, מתחילה מ-₪160 לחודש."
    ],
    "not_included_line": "שום הרחבה לא כלולה אוטומטית במחיר הכניסה.",
    "cta": { "label": "פרטים על מערכת הלידים", "href": "/maoved" },
    "asset_guidance": "Show only real product UI or explicitly labelled demo data. Never imply a full CRM is included in any entry price."
  },
  "ai_search": {
    "heading": "ושימצאו אותך גם כששואלים AI",
    "lines": [
      "היום לקוחות שואלים גם עוזרי AI, לא רק את גוגל.",
      "אנחנו בונים תוכן שעונה ללקוחות בשפה שלהם, ומוסיפים נתונים מובנים כשצריך.",
      "חשוב לדייק: אין כאן הבטחה להופיע בתוצאות ה-AI של אף ספק."
    ],
    "positioning_guidance": "Concise supporting section only — never a third hero offer."
  },
  "people": {
    "heading": "מי עומד מאחורי WAO?",
    "intro": "מאחורי המערכת יש אנשים אמיתיים, עם ניסיון בשיווק דיגיטלי מאז 2006.",
    "person": {
      "photo": "/eitan-yariv.avif",
      "name": "איתן יריב",
      "role": "מייסד WAO, יועץ שיווק ופרסום בגוגל",
      "bio": "איתן בנה את השיטה של WAO: שיווק מדויק לעסקים קטנים, בלי מונחים גבוהים ובלי חוזים מסובכים."
    },
    "cta": { "label": "להכיר אותנו", "href": "/about" },
    "case_study_guidance": "Case study omitted: no repository evidence supports owner, city, need, work, period, result, and measurement together. Do not invent testimony, and do not use large-company logos or testimonials as main proof for this audience. Photo must be the existing approved asset only — no generated people imagery."
  },
  "faq": {
    "heading": "שאלות שבעלי עסקים שואלים",
    "items": [
      {
        "q": "יש לי כבר אתר. זה רלוונטי אליי?",
        "a": "בהחלט. מסלול המודעות מביא לקוחות לאתר שיש לך — או לדף נחיתה חדש וממוקד יותר."
      },
      {
        "q": "מה צריך להכין לפני שמתחילים?",
        "a": "רק את הפרטים הבסיסיים של העסק: מה אתה עושה, איפה אתה נותן שירות ואיך ליצור איתך קשר. את השאר נשלים יחד."
      },
      {
        "q": "אין לי רקע בשיווק. זה בעיה?",
        "a": "להפך — בשביל זה אנחנו כאן. אתה איש המקצוע, ואנחנו מטפלים בצד השיווקי. אתה לא צריך ללמוד מקצוע נוסף."
      },
      {
        "q": "מתי יתחילו להגיע פניות?",
        "a": "זה תלוי במסלול, בביקוש, בתחרות, בתקציב ובהצעה שלך. במודעות — הקצב תלוי בחשיפה. בנוכחות אורגנית — זה גדל בהדרגה, לא בן לילה."
      },
      {
        "q": "יש התחייבות או חוזה ארוך טווח?",
        "a": "התנאים המעודכנים מופיעים בדף כל שירות. בדוק אותם לפני שאתה מאשר תשלום."
      }
    ]
  },
  "final_cta": {
    "heading": "בוא נראה איך זה נראה על העסק שלך.",
    "body": "מתחילים מכמה פרטים על העסק — ומקבלים משהו קונקרטי לראות. שני המסלולים פתוחים לפניך, ובוחרים רק את מה שמתאים.",
    "primary_cta": { "label": "תראה לי את המודעה שלי", "href": "/google-ads/onboarding" },
    "secondary_cta": { "label": "רוצה לבנות נוכחות מקומית? מתחילים כאן", "href": "/site-bot/start" }
  }
}
