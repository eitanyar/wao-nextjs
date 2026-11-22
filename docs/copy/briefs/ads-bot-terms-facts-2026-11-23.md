# Brief: Ads Bot terms, factual corrections (2026-11-23)
Same persona/offer as docs/copy/briefs/ads-bot-pilot-patches-2026-11-22.md. This is LEGAL text: keep the formal tone, change only what is false. Deliver byte-exact old->new patches (--patches), each `old` a substring that occurs exactly once in docs/legal/ads-bot-terms-of-use.md (give enough context to be unique; lines 48 and 152 are different rows).

Facts: (1) no Ads Bot surface collects an עוסק/ח.פ. number at sign-up, only a VAT bracket in the chat; drop that sentence (leave the rest of the line). (2) The Ads Bot's language processing (ad copy, landing pages, onboarding chat) runs on Google Gemini (Google AI Studio API, Google, USA), NOT Alibaba/Qwen. Replace the Alibaba Cloud / Qwen / Singapore entries with Google (Gemini API) everywhere below, keeping each table row's other cells in the same style. Do NOT touch DataForSEO or NeuronWriter rows (unconfirmed, Eitan decides). Line 162 mentions Singapore; fix so it is true (processing in the USA / outside Israel), keep every other sentence byte-identical. Line 173 lists the sub-processors in a bold sentence: swap the Alibaba entry for Google Gemini, keep the rest byte-identical.

Verbatim current lines:
LINE 11: `השירות מיועד לעסקים — עוסקים מורשים, עוסקים פטורים וחברות — הרוכשים אותו לצורך עסקי. בהרשמה תתבקש למסור מספר עוסק/ח.פ.`
LINE 48: `| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה | כתיבה וניתוח של טקסטים למודעות ולעמודי נחיתה |`
LINE 152: `| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה לכתיבה וניתוח | תנאי השירות של הספק |`
LINE 162: `חלק מהספקים המפורטים לעיל מעבדים מידע מחוץ לישראל, לרבות בסינגפור ובארצות הברית. מועבר רק המידע הדרוש לביצוע הפעולה. לצורך התאמת הקמפיינים ללידים אמיתיים נשלחים ל-Google Ads מזהה קליק, מועד פנייה ומצב ליד, כמפורט בסעיף 10. בהצטרפותך לשירות אתה מסכים להעברה זו. הספקים מעבדים את המידע לפי תנאיהם המסחריים.`
LINE 173: `**ספקי משנה מאושרים לבוט הפרסום:** Google Ads, Fraud Blocker, Cloudflare Pages, Cloudflare DNS, Google Business Profile, Alibaba Cloud (מודלי Qwen, אזור סינגפור), DataForSEO, NeuronWriter, Google Places API, וספקי סליקה ודוא״ל כלליים.`
