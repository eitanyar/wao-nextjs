# Brief: one scripted reply in COMPLETED state (2026-11-23)
Persona/offer as in docs/copy/briefs/ads-bot-pilot-patches-2026-11-22.md. Singular male.

File src/app/api/bot/route.ts line 753. Current string (the text between the outer quotes, verbatim):
`הקמפיין כבר הוגדר והחשבון ממתין לך במייל. אם תרצה להקים קמפיין חדש, אני כאן.`
False: no campaign is set up and no account is waiting. This reply fires for any message sent after the flow reached its end, in two situations: (1) he said he is fully booked and cannot take new work now, (2) he approved the details and WAO is preparing and reviewing before anything goes live. Only a direct API call reaches it today, but it must be true anyway.
Deliver ONE neutral reply that is true in both cases: his details are with us, nothing goes live without us writing to him by email first, and he can write again here if something changes. Give it as a single byte-exact old->new patch (--patches), old = the exact string above (verify with the repo file).
