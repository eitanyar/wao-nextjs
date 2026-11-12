# Two fact fixes before /site-bot and /google-ads ship (2026-11-12)

Return byte-exact patches (old → new), each with a one-line English `why`.

## 1. Site Bot terms §6: owner decision on domains (legal text, plain and precise)
Eitan decided: a business that already has its own domain gets its Site Bot site on that domain from the start. Its Google Business Profile should never point to a temporary WAO address. The WAO subdomain is only for businesses that have no domain. Today's §6 says the opposite: the first month always runs on a WAO subdomain.

Rewrite only the first paragraph of §6 (below), keeping the rest of §6 untouched:
- With his own domain: the site runs on it from the start, live within three business days from when we get working access to the domain (this matches the page FAQ below).
- Without a domain: the site runs on a WAO subdomain, live within one business day after payment. He can buy a .co.il domain in his name at his expense through any registrar at any time, and we'll connect it. We can also help.
- Registering, paying for and renewing the domain is his responsibility alone.
- He may have an existing website on his domain. Don't promise anything about migrating or keeping its content; just say the Site Bot site is what runs on the domain once connected.
Keep the legal register already used in the terms, and keep the second paragraph ("the domain and the Google business profile stay yours") verbatim.

Current §6:
### 6. דומיין ונכסים

בחודש הראשון האתר פועל תחת תת-דומיין של WAO. תוכל בכל עת לרכוש דומיין מסוג co.il על שמך ועל חשבונך, דרך כל חברת רישום שתבחר, ואנו נחבר אותו לאתר. נוכל גם לסייע לך בתהליך. רישום הדומיין, התשלום עליו וחידושו הם באחריותך בלבד. אם יש לך דומיין קיים, ניתן לחבר אותו לשירות.

הדומיין ופרופיל העסק ב-Google נשארים שלך בכל מקרה.



Page FAQ it must agree with:
faq[2].a :: אם האתר על כתובת שלנו, הוא עולה תוך יום עסקים אחד אחרי התשלום. אם הוא על דומיין שלך, תוך שלושה ימי עסקים מרגע שקיבלנו גישה לדומיין.

## 2. /google-ads `does.items[1].desc`: the claim overstates the product
Verified against the code. The bot does NOT stop running spend or cap cost per enquiry. What it does:
(a) blocks searches that burn money without bringing enquiries;
(b) caps the price per click;
(c) won't add budget while the cost per enquiry is above the target set for the business;
(d) fake-click filtering is included.
Rewrite the line to say only these things, in the same short card style and length. Avoid "stops overspend" or any wording implying a hard per-enquiry cap.

Current:
does.items[1].desc :: הבוט חוסם חיפושים ששורפים כסף בלי פניות, תקרת עלות לפנייה עוצרת חריגה, וסינון קליקים מזויפים כלול.
