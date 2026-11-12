# Site Bot generated sites: redesign UI labels (2026-11-12)

Where it goes: fixed interface labels in the template of every client website that Site Bot generates (Israeli one-man local businesses: plumbers, electricians, beauticians). Same labels on every site; the business's own data fills the variables. The reader is a consumer on a phone, often in a hurry (a leak, a broken AC). The page speaks in the business owner's first person singular male ("I"), e.g. the existing heading "מה אני מטפל בשטח" and subhead "איש מקצוע אחד שמטפל בכל מה שצריך". Labels must be short, native, plain spoken Hebrew. No marketing hype: these are signposts, not slogans.

Variables in {curly braces} stay exactly as written. Hebrew number/plural agreement must work for any {count} (1, 2, 5, 37).

Needed (key: what it is):
1. nav.label: screen-reader name of the main menu (aria-label).
2. skip.link: "skip to content" link for keyboard users.
3. hero.rating.count: chip next to the star score, e.g. "{count} reviews on Google". Needs singular for count = 1.
4. hero.hours.open: short status under the call buttons when the business is open now.
5. hero.hours.closed: same, when it's closed now, with the next opening time {time}. Must not discourage calling or WhatsApp.
6. trust.label: screen-reader name of the trust-facts list.
7. reviews.heading: section heading above real Google reviews (first person fits).
8. reviews.list.label: screen-reader name of the scrolling review cards.
9. reviews.seeAll: link to the full reviews on the Google profile.
10. review.date.relative: "{n} days ago", "{n} weeks ago", "{n} months ago", "a year ago", "{n} years ago": a full set with singular forms.
11. gallery.heading: heading above 4 photos of the business's real work.
12. photo.alt.job / photo.alt.owner / photo.alt.van: alt-text patterns for {businessName} photos (a finished job, the owner, the work vehicle).
13. about.heading: heading of the short owner bio section (first person fits).
14. footer.hours.label, footer.areas.label: labels in the footer for opening hours and service areas.
15. form.submit: submit button of the "call me back" form (name and phone only). It must say what happens, not "call now".

Return JSON: {"labels": {"<key>": "<Hebrew>" , ...}, "notes": "..."}. One pick per key; add an alternative only where you're genuinely torn.
