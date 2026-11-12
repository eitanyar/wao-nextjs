# Site Bot client sites: Google profile link label (2026-11-12)

Where it goes: a short link on every generated client website (one-man local trades: plumbers, electricians, beauticians). It appears on the home page, in its own small section after the service areas, and as the first row of every page footer. The link opens the business's Google profile (the Maps listing, where its reviews and details are). The page speaks in the owner's first person singular male ("I"): e.g. the existing heading "מה אני מטפל בשטח", plus the approved redesign labels "מה לקוחות אומרים עליי" and "לכל הביקורות ב-Google".

Constraints:
- One short link text, at most 30 characters, no variables.
- It may contain the Latin word "Google" (the site's approved labels write "ב-Google" / "מ-Google"; keep that form). The renderer isolates it for bidi.
- It must say where the link goes (the business on Google), not a vague "click here".
- It must not duplicate the reviews link "לכל הביקורות ב-Google", which is a separate, later element.

Return JSON: {"label": "...", "alternatives": ["...", "..."], "notes": "..."}.
