# Noa QA — Dash video scripts r2 (2026-11-12), summary saved by Adam

Noa could not create files in this run; Adam saved this summary. Her byte-exact fixes are applied in docs/copy/video-dash-scripts-r3-2026-11-12.json.

- Round-1 fixes: all applied or replaced by equal native fixes.
- **Audio tags:** 42 non-standard v4 tags were mapped to standard ones ([calm], [deadpan], [sarcastic], [tired], [sighs], [whispers], [short pause]).
  - Each tag still performs its own line.
  - No two lines in a row share a tag.
  - The S3 shelf line uses [sighs] instead of [sarcastic], so the joke stays on his side.
- Homographs in `voice`: שָׂמוּ (S1), מְסַפְּרִים (S3).
- **Hard-line fixes:**
  - A3 headline 2 no longer reads as "the only number: customers";
  - S2 long headline 1 says customers leave a review, not write one;
  - S2 description 1 says he finishes the job.
- **Open listen tests (Adam/Eitan):**
  - WAO as מִוָואוּ vs מוואו;
  - סַיְיט בּוֹט;
  - whether v4 honours tags on Hebrew lines.
- **Style notes for Tamar (not applied):**
  - A1 banner "כסף מדמם" → "הכיס מתרוקן";
  - A3 "בלי דוחות יפים" → "מנופחים";
  - S3 "באותו סיפור";
  - S3 "לקוח מיזוג";
  - S1 hook 2 banner reuses the coffee banner.
- Banner visuals must not mimic OS notifications (Maya/Dana).
- **Proposed writing upgrades:**
  - use only documented engine tags;
  - no two consecutive lines from one speaker with the same tag (unless the repeat is the joke);
  - nikud on common words that have a second everyday reading.
