# Site Bot redesign labels, round 2: align with the SEO/legal conditions (2026-11-12)

Your round-1 labels are in docs/copy/site-bot-redesign-ui-labels-2026-11-12.waocopy.json; the original brief is docs/copy/briefs/site-bot-redesign-ui-labels-2026-11-12.md. Yonatan's binding conditions (docs/design/site-bot-redesign-seo-conditions-yonatan-2026-11-12.md) change these:

1. **Drop "open now" / "closed now"** (hero.hours.open, hero.hours.closed). A static page can't know the time. Replace them with one hero line that shows the opening hours as text, using {hours}, e.g. "Sun–Thu 8:00–18:00". Give the label only, plus a variant for when hours are missing (then the line is hidden, so no text is needed; just confirm).
2. **No relative dates** (review.date.relative). Review dates are shown as month and year, e.g. {month} {year}. Give the pattern, e.g. "{month} {year}", with Hebrew month names if a label is needed around it. Usually no label is needed. Say so if so.
3. **NEW: Google source label.** A short visible credit on the rating chip and above the reviews: the reviews and rating come from Google. Example idea: "{count} reviews on Google", with "Google" kept as the Latin word inside the Hebrew line.
4. **NEW: review-selection line.** One short line under the reviews heading saying how the reviews were picked: the most recent ones from the business's Google profile.
5. **NEW: og fallback card.** The image shared on WhatsApp/Facebook when the business has no photo: {businessName} + {topService} + {city}. Give the layout text if any word is needed beyond the variables; probably none, so say so.
6. **Reviewer names** are shown exactly as Google returns them (no first-name-only).

Keep all your other round-1 labels unless one of these changes affects them. Return the FULL label set as JSON, in the same shape as round 1: {"labels": {...}, "notes": "..."}.
