# Brief: demo-site patches + demo label for the S1-15 video ad, 2026-11-14

**What this is:** the fictional demo plumber whose website appears on screen in our Site Bot video ad. Eitan renamed the business «יוסי אינסטלטור ברעננה» (15 reviews, 4.9). The site's text still places him in Holon and Bat Yam and contains test names. Move him to Raanana and a neighbouring town, and remove the test names. Keep every sentence's meaning and voice, and change only what is needed.

**Deliver JSON {"patches":[{"file","old","new","why"}], "demo_label": {...}}**. The file is `data/video/demo/stand-in/site-record.json`. Each `old` must be an exact substring of that file, quoted below.

Strings to patch. Each may appear several times; one patch per distinct string is fine. Pick the neighbouring town yourself: a real town next to Raanana that a plumber would cover.
- `"targetLocation": "חולון"` and `"city": "חולון"`, and the bare list item `"חולון"`
- `"specificCities": "חולון, בת ים"`
- `"travelBoundary": "עד 15 ק״מ מחולון"`
- `"responseTime": "אותו יום בחולון ובבת ים"`
- `"heroHeadline": "אינסטלטור בחולון: מאתר נזילות עם מצלמה ומתקן באותו יום"`
- `"heroHeadline": "איתור נזילות בחולון — עם מצלמה, באותו יום"`
- `"heroHeadline": "פתיחת סתימות בחולון — מגיע היום"`
- `"heroHeadline": "התקנת דודים בחולון על הצנרת הקיימת"`
- `"aboutPageHeadline": "מאתר נזילות בבת ים עם מצלמה"`
- the list item `"חולון ובת ים"` and the bare list item `"בת ים"`
- `"a": "אצל TEST M2a Plumbing בחולון: בדיקת מצלמה מאתרת נזילה סמויה גם כשהיא נסתרת. אני מגיע באותו יום בחולון ובבת ים."` (also replace the test business name with the real demo name or «יוסי»)
- `"ownerName": "Test Owner A"`: give him a plain fictional Hebrew name that fits «יוסי».

**demo_label:** the small tag shown on real product screens in our videos, telling the viewer it's a demonstration with a fictional business. At most 2–3 words, Hebrew, readable at a glance, honest without killing the sale. Give `text` and `why`.

**Rules:** singular male. Real place names only. No new claims.
