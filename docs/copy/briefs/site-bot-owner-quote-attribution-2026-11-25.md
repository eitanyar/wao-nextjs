# Brief: Site Bot client home page: attribution under the owner's own quote (2026-11-25)

**Where:** on every Site Bot client home page (the client's own site, read by his customers, not by him), in the hero, right under the sub-headline. Code shows one short sentence the owner himself said in our interview, word for word in gershayim ״…״. For example ״רוב העבודה שלי ברעננה ובכפר סבא״ or ״15 שנה אני פותח סתימות בשרון״. Under or after it comes a short attribution, so the reader knows these are the owner's words, not marketing copy. It must never look like a customer review.

**Strings needed (key → string):**
- `OWNER_QUOTE_ATTRIBUTION_NAMED`: used when we know his first name. Placeholders `{ownerFirstName}` and `{businessName}` exactly as written. Very short (a dash-led signature line is fine).
- `OWNER_QUOTE_ATTRIBUTION_ANON`: used when we don't have his name. Placeholder `{businessName}` only.
- `OWNER_QUOTE_ARIA_LABEL`: a screen-reader label for the quote block, e.g. "in the owner's words".

**Constraints:** the owner is singular male; no praise words; no "customer"/"review" wording; works for any trade; plain JSON, key → string.
