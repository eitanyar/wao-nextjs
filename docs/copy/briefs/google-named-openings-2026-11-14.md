# Brief: name Google at the start of four voiced ad lines, 2026-11-14

Eitan's rule from today: the listener must know from the first seconds that the ad is about a GOOGLE campaign/ads, not "a campaign" or "advertising" in general. His own fix on another ad was «הקמפיין שלך הוא דוכן טעימות בשוק» → «הקמפיין שלך בגוגל הוא כמו דוכן טעימות בשוק».

For each line below, make the SMALLEST change that names Google where the campaign/advertising/clicks first appear (usually adding «בגוגל» or «של גוגל»). Keep everything else byte-identical: the [tag] at the start, niqqud, punctuation and rhythm. These lines are re-recorded by a TTS voice (Nimrod), so they must sound natural by ear, in singular male, and must not get much longer.

Lines (the exact current voice strings, including tags):

- A1-30 line 0: `[deadpan] אתה סוֹפֵר קליקים כמו מונה של מונית, וכל קליק הוא עוד נוסע שעולה.`
- ST03 line 0: `[matter-of-fact] טכנאי מזגנים מנתניה החליט לבנות קמפיין לבד, כי הוא מבין במערכות מורכבות.`
- ST04 line 2: `[matter-of-fact] אז הפעם, כשמציעים לו קמפיין, הוא מחכה למלכודת.`
- ST07 line 0: `[matter-of-fact] אינסטלטור מבת ים כבר נכווה מפרסום, אז הפעם הוא בא עם פנקס ושאלות.`

Deliver JSON {"patches":[{"file":"<ad id>","old":"<exact current line>","new":"<new line>","why":"..."}]}. One patch per line, with the old string byte-exact as given.