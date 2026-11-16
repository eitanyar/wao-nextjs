# Brief: no-domain variants of two cancel-notice strings (2026-11-16)

Same context as docs/copy/briefs/site-bot-review-kit-cancel-notices-2026-11-16.md. Approved strings are in docs/copy/site-bot-review-kit-cancel-notices-FINAL-2026-11-16.json.

Some Site Bot clients have no domain of their own: their site lives on a WAO sub-address. For them the line "the domain stays yours" is false. Write variants that keep everything else (same facts, same tone, same {variables}) but drop the domain claim; the Google business profile still stays his.

Deliver JSON with exactly: `cancelEmailBodyNoDomain` (variant of `cancelEmailBody`), `offlineSoonBodyNoDomain` (variant of `offlineSoonBody`), plus `why`. Change as little as possible from the approved versions; fix verb/adjective agreement where removing the domain changes the subject. Hebrew maqaf (־) before digits/{offlineDate}.

## Approved strings (byte-exact; \n = line break)

`cancelEmailBody`:
```
המנוי שלך ממשיך עד {paidThrough}, סוף החודש ששילמת עליו.
גם אחרי זה האתר נשאר באוויר, עד {offlineDate}.
הדומיין והפרופיל העסקי בגוגל נשארים שלך, כמו שהיו מהיום הראשון.
```

`offlineSoonBody`:
```
זה יקרה ב־{offlineDate}. עד אז האתר עובד כרגיל.
הפרופיל העסקי בגוגל והדומיין נשארים שלך גם אחרי.
```

Variables: {paidThrough} = last paid day, {offlineDate} = paidThrough + 30 days. Facts: subscription ends at the end of the paid month; the site stays up 30 days after; the Google business profile is his and stays his; no buyout, no price, no online undo.
