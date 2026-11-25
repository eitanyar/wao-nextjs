# Brief: Site Bot waiting-list + profile-block follow-up strings (2026-11-25)

**Where:** same place as `docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json` (the free-check result page, where the buy button used to be). Same persona: a one-man tradesman with a Google profile and no website, on a phone, arriving from an ad. Keep the voice of that file.

**Why:** two gaps found in review.
1. The waiting-list form needs short inline error messages (shown under the field when he taps submit). Today the button just stays grey with no reason.
2. The profile block (`NOT_ELIGIBLE_PROFILE`) lists three causes, but the code can only detect two of them from Google's public data: (a) the business is marked closed, temporarily closed or not operating; (b) the profile has zero ratings. It cannot detect "unverified" or "suspended". Show him only his own cause.

**Strings needed (key → string):**
- `WAITLIST_INVALID_NAME`: name field empty.
- `WAITLIST_INVALID_PHONE`: the phone number isn't a valid Israeli number. Hint the expected form briefly (mobile or landline, digits only is fine).
- `WAITLIST_INVALID_EMAIL`: the optional email was filled but is malformed.
- `NOT_ELIGIBLE_PROFILE_CLOSED`: Google shows his business as closed / temporarily closed. Tell him to update the status in his profile, then run the check again. Don't guess why it's closed.
- `NOT_ELIGIBLE_PROFILE_NO_RATINGS`: no ratings yet. Site Bot builds on real reviews, so first get a few (send a happy customer a short message asking for a rating), then run the check again.

**Constraints:** singular male; no prices or dates; no new promises; one or two short sentences each. Plain JSON, key → string.
