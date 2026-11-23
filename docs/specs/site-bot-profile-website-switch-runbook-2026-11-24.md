# Manual Profile Website Switch: Form and Runbook (Site Bot pilot)

_Yonatan (seo-strategist), 2026-11-24. Signed off by Adam. Replaces §5 of `docs/reviews/site-bot-mvp-hard-audit-2026-11-24.md`._

**Client:** ____ · **Profile name and Place ID/CID:** ____ · **Operator:** ____ · **Reviewer:** ____
Scope: profiles with **no website**. No API writes (disabled). All edits are made by hand in Google's Business Profile UI.
Switch dates are **staggered across clients**, so the clients who haven't switched yet serve as a control group (§9-B3).

## 1. Pre-check (any "yes" = STOP, fix it with the owner or don't take the client)
- [ ] The name carries keywords or a city beyond the real business name
- [ ] The address is a virtual office, coworking space or mailbox
- [ ] The primary or secondary categories don't match the real trade
- [ ] The profile is suspended, unverified, showing "Review issues", or has edits pending
- [ ] **The website field already has a URL → STOP.** Not in the pilot (policy: we never replace an existing site)
- [ ] The owner or anyone else is planning profile edits in the next 14 days

## 2. Snapshot of the old values (screenshots attached, with dates)
Website (expected: empty), name, phone, address or service area, hours, primary and secondary categories, description,
appointment link, and verification status. Save full-page screenshots of the edit panel and the public Maps listing.
Record the capture time: ____

## 3. Written owner consent (store all of it in the client record)
- The exact change: "Add **[URL]** to the website field of **[profile name / Place ID]**. No other field will change."
- The planned date, and that the edit may sit "under review" for up to 30 days
- The rollback, in plain words: "If needed, we remove the website field."
- A link to Google's "Working with a third party" disclosure
- The owner's written reply (WhatsApp or email): an export or screenshot with timestamp, his name and the number or
  address it came from. **Verbal approval doesn't count.**

## 4. Site readiness (all must pass for at least 48 hours before the switch)
- [ ] Domain type: **own domain** (preferred) / **WAO subdomain** (only for businesses without a domain; note the exit plan)
- [ ] HTTP 200, no `noindex`, robots.txt allows crawling, self-referencing canonical
- [ ] Sitemap is live and listed in robots.txt
- [ ] Name, address and phone are **byte-equal** to the snapshot (copy and diff, don't eyeball)
- [ ] Services and areas on the site match the profile's categories
- [ ] Final URL recorded exactly (https, no trailing redirect): ____
- [ ] Search Console verification: **"after the terms change"** (terms §5 and §10 currently forbid it). Skip it for now and record it as pending.

## 5. Update-window check
- [ ] Open the Google Search Status Dashboard on the switch day. Screenshot it.
- [ ] No ranking update is active (core or spam), **and** the last one was marked complete **at least 7 days ago**
- As of 2026-11-24, the November 2026 core update (started 10 Nov) is **not marked complete**. No switches until it is
  complete plus 7 days. Site build and owner consent may run from 29.11.

## 6. Baselines (after the update window is clear)
- **Grid rank:** the same 3 to 5 queries (bare trade term plus "trade + city"), same grid, same center point, same time
  of day. **Two scans**, at d-7 and d-1. Record the Local Pack top-3 cell count for each query and the spread between
  the two scans (this is the natural noise).
- **GBP Performance:** screenshot the last 3 months. Record calls, direction requests, website clicks (expected 0) and
  total interactions.

## 7. The switch: one field only
- [ ] Edit **Website** only. Save. Screenshot the confirmation.
- [ ] For 7 days: no other profile edits by WAO or the owner (no hours, photos, posts or categories). Don't accept
  "Google updates" suggestions; screenshot them instead.

## 8. Monitoring
| When | Check | Result |
|---|---|---|
| 24 h | Edit published, under review or rejected; profile status; URL visible on Maps/Search; site 200 | |
| 72 h | Same, plus Google emails and notices | |
| 7 d | Same, plus grid scan | |
| 14 d | Grid scan, plus 14-day Performance vs. baseline | |
| 28 d | Grid scan, plus 28-day Performance vs. baseline; close the log and send the change log to the owner | |

## 9. Rollback trigger (agreed before the switch)
**A. Profile notice** (suspension, re-verification request, "Review issues"): **freeze**. Make no further edits and don't
remove the URL while a review is open. Resolve it with the owner, and escalate to Adam. After the profile is back in
good standing, decide whether to remove the field.

**B. Performance.** Remove the website field only if **all** of these hold:
1. Local Pack top-3 cells across the query set fall **≥30% below the baseline average**, **and** by at least 3 cells in
   absolute terms, **and** by more than the baseline noise;
2. this holds on **two scheduled scans in a row** (d14 and d28; or d7 and d14 if the d14 drop exceeds 50%);
3. it isn't explained by an update or market shift: no update started in the window, and the pilot clients who haven't
   switched yet (the control group) didn't move the same way;
4. calls plus direction requests are down too, not just rank (website clicks are new, so they can't count).

**Action:** remove the website field in Google's UI and screenshot it. The site stays live. Tell the owner the same day,
log the reason and review before the next switch.

Sign-off: Operator ____ · Reviewer ____ · Date ____

## Ranking risk for a no-website profile (Yonatan)
Low. Google ranks local results on relevance, distance and prominence, and a consistent site usually adds to relevance.
The risks are around the switch, not the link itself:
1. **The edit can put the profile under review.** Edits can take up to 30 days to review. This is worst when the profile
   already has a hidden problem, which is why the pre-check stops those clients.
2. **Mismatched details** (name, address, phone, services, areas) send Google mixed signals.
3. **Sites that look alike:** thin sibling sites linked from many profiles can look like a low-quality network.
4. **A WAO subdomain is fragile:** the link breaks when the client leaves (the card exit covers this).
5. **Blame:** any drop during an update window gets blamed on the switch.

## Sources (fetched 2026-11-24)
- [Google Search Status Dashboard, ranking incidents](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)
- [Search Engine Journal: November 2026 core update](https://www.searchenginejournal.com/google-november-2026-core-update/596614/)
- [Google: what happens to your Business Profile edits](https://support.google.com/business/answer/3038311?hl=en)
- [Google: edit your Business Profile](https://support.google.com/business/answer/6331288?hl=en)
- [Google: verify your business](https://support.google.com/business/answer/7107242/)
