# Hero motion: "three taps, and it's there"

Two corrections to my earlier plan: the "small demo tag" in section 3 is dropped per Eitan's rule, and the chat grows from 2 questions to 3 with tap-only answers.

## 1. The feeling and its cues

**Feeling:** "He tapped three times and his ad was there."

- **Taps, never typing.** Every answer is one click on a ready-made chip.
- **Zero waiting.** Each next question is already arriving as the click lands.
- **One "done" reveal.** The ad and the page arrive as a single result, not as assembled parts.

**What kills it:**
- typed text, a blinking cursor in a field, or "typing…" dots;
- spinners or progress bars;
- a fourth question;
- a pointer that hesitates or backtracks;
- chat text too small to read, so each question fills the laptop screen, one at a time.

## 2. Storyboard (9.6 s, inside the laptop screen)

| # | Time (ms) | What moves | Pointer | Eye lands on |
|---|---|---|---|---|
| 1 | 0–1300 | Q1 and 3 chips are already on screen at frame 0. On the click at 900 the chip fills green and becomes the answer bubble (200 ms). | Enters from the lower corner and arcs to the chip (500 ms, ease-in-out). | The chosen chip |
| 2 | 1300–2500 | Q2 and chips rise 12 px and fade in (250 ms, ease-out). Click at 2100. | Short hop of about 400 ms. | Chip 2 |
| 3 | 2500–3700 | Q3, same as beat 2. Click at 3300. | Short hop. | Chip 3 |
| 4 | 3700–4500 | The "ready" cue pops with a green check (scale 0.9→1, 250 ms). The chat then shrinks into the corner chip (450 ms, ease-in-out). | Still. | The check |
| 5 | 4500–6700 | The ad card rises 24 px and fades in (500 ms, ease-out). One highlight sweeps its headline (600 ms), then holds for 1100 ms. | Drifts toward the ad and stops beside it, never over the text. | Ad headline |
| 6 | 6700–9000 | The landing page slides up beneath the ad (600 ms, ease-out). The highlight lands on the page headline, and the call button glows once at 8200 (500 ms). | Glides to the call button and rests. | Page headline, then the button |
| 7 | 9000–9600 | The pointer fades out and the replay control fades in (300 ms). This is the resting frame. | Gone. | Nothing new |

The three answers must produce exactly the resting frame (the trade, Ra'anana, and the leak-detection service), so the ad visibly repeats what he tapped.

**NEEDED strings** (from waocopy, or from the real intake wording where it exists):

| String | Purpose | Max length |
|---|---|---|
| Q1 | Asks the trade | 26 chars |
| Q2 | Asks the service area | 26 chars |
| Q3 | Asks the main service to push | 26 chars |
| 9 chips (3 per question) | Answer options; the correct one matches the resting frame | 12 chars each |
| Ready cue | Says the ad and page are ready | 14 chars |
| Static cue | Reduced motion: "3 questions → your ad + page" | 30 chars |
| Replay label | Accessible name for the replay control | 16 chars |
| Screen-reader description | Describes the whole sequence | 140 chars |

## 3. Pacing rules for Maya

- **Easing:** entrances use `cubic-bezier(0.22,1,0.36,1)`. The pointer and the chat collapse use `cubic-bezier(0.65,0,0.35,1)`. No bounce and no linear motion.
- **Properties:** transform and opacity only.
- **Simultaneous motion:** at most two things move at once, the pointer plus one element.
- **Pointer:** a standard arrow at true scale that moves on slight arcs. A click is a 90 ms press (scale 0.92) plus a soft ring.
- **Holds:** the ad headline stays still for at least 1500 ms in total, and the page headline for at least 1200 ms. Every chip stays visible for at least 600 ms before its click.
- **Trigger:** it plays once. On desktop it starts when the page is idle, and on phone when 60% of the window is in view.
- **Paint:** the server paints the resting frame first. The animation swaps in only when it starts, so there is no layout shift.
- **Replay:** a small icon in the corner of the window, with a 44 px touch target, visible only at rest.
- **`prefers-reduced-motion`:** the resting frame plus the static cue line, with no pointer.

## 4. Proving it feels easy

- **Recording:** Roni captures a 10–12 s screen recording at 1440 px and at phone width. Eitan watches each once, at normal speed.
- **Hallway check:** five people who are not marketers watch once with no explanation, then answer two questions: "How long did that take him?" and "What did he get?"
- **Pass:** at least 4 of 5 say "seconds", "a minute" or "three clicks", and at least 4 of 5 name both the ad and the page.
- **If it fails:** "it happened too fast" means lengthening the holds, not adding steps. "He filled in a form" means the chips look like fields and need restyling.