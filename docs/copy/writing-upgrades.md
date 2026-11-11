# Writing upgrades for waocopy (Tamar on Qwen 3.8 Max)

Abstract rules Noa (language-qa) derives from recurring patterns in waocopy output; Adam/Eitan approve them.
`scripts/waocopy.mjs` sends **only the bullet lines under "## Approved rules"** to the model, on every run.

Rules must stay abstract — never quote an example sentence or a concrete phrase (examples leak into output).
Add a rule only after Eitan or Adam approves it; record where it came from under "## Log".

## Approved rules

## Log
