#!/usr/bin/env node
/**
 * Multi-run Puppeteer driver for the Site Bot / Google Ads onboarding flow.
 *
 * Drives real scripted personas through the ACTUAL chat UI at
 * /google-ads/onboarding (not the /api/site-bot/* injection shortcut that
 * scripts/test-site-bot.mjs uses) — clicking real buttons, typing into the
 * real <input>, uploading real files, and following the real REVIEWING →
 * checkout flow. Produces one evidence transcript per run for Roni
 * (verifier) to grade PASS/FAIL against afterward. This script does NOT
 * grade runs itself.
 *
 * Usage:
 *   node scripts/onboarding-multi-run.mjs
 *   node scripts/onboarding-multi-run.mjs --personas scripts/onboarding-personas.json
 *   node scripts/onboarding-multi-run.mjs --only 1
 *   node scripts/onboarding-multi-run.mjs --headed
 *   node scripts/onboarding-multi-run.mjs --allow-simulation   (see preflight note below)
 *
 * ── CRITICAL preflight note ──────────────────────────────────────────────
 * There is NO client-side "live mode" toggle for the conversational logic.
 * The onboarding page's visible "Sandbox / Live (locked)" buttons only
 * control Google Ads account creation (clientId routing), NOT which bot
 * brain answers you. The real branch is chosen server-side in
 * src/app/api/bot/route.ts:
 *
 *   if (apiKey) return handleGemini(...);                    // real ADAM_SYSTEM_PROMPT (Gemini Flash)
 *   return handleSimulation(...);                             // hardcoded stub
 *
 * apiKey comes from process.env.GEMINI_API_KEY. As of this writing that
 * line is COMMENTED OUT in .env.local, so the dev server always falls
 * through to handleSimulation() — confirmed by a live curl against
 * POST /api/bot, which returned "isSimulation": true.
 *
 * This driver cannot flip that server-side switch itself (it's a real
 * Gemini credential + real spend, deliberately dormant — not something an
 * engineer should silently re-enable). Instead, it does a preflight check
 * against /api/bot before running any persona:
 *   - if isSimulation === true  → refuses to run the full batch and prints
 *     the fix (uncomment GEMINI_API_KEY in .env.local + restart `npm run
 *     dev`), unless --allow-simulation is passed (for driver self-testing
 *     only, with stub personas, never for grading real transcripts).
 *   - if isSimulation === false → confirms and proceeds.
 */

import puppeteer from "puppeteer";
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname, join, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function argVal(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1];
}
const flag = (name) => args.includes(`--${name}`);

const PERSONAS_PATH = resolve(ROOT, argVal("personas", "scripts/onboarding-personas.json"));
const BASE_URL = argVal("base-url", "http://localhost:3000");
const HEADLESS = !flag("headed");
const ALLOW_SIMULATION = flag("allow-simulation");
const ONLY_ID = argVal("only", null);
const OUTPUT_DIR = resolve(ROOT, "scripts/onboarding-personas/output");

// ── Known UI constants (from src/app/(app)/google-ads/onboarding/page.tsx
//    and src/lib/bot/delivery-model.js — read directly, not guessed) ──────
const DELIVERY_LABELS = {
  field: "אני מגיע ללקוח",
  location: "הלקוח מגיע אליי",
  remote: "מרחוק",
  mixed: "גם וגם / תלוי בשירות",
  // KNOWN BUG (not fixed here, per scope): prompts.ts defines an "event"
  // serviceModel branch but delivery-model.js's deliveryModelOptions has no
  // "event" button. Personas that specify deliveryModelButton: "event" will
  // fall back to "mixed" below, and this is logged loudly as a friction
  // point in the transcript, not silently patched around.
};
const SEND_BUTTON_TEXT = "שלח";
const APPROVE_BUTTON_TEXT = "לתשלום";
const BYPASS_BUTTON_TEXT = "דלג על תשלום";
const YAAD_PAY_BUTTON_TEXT = "בצע תשלום";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Persona loading — data-driven, decoupled from driver logic ───────────
function loadPersonas(path) {
  if (!existsSync(path)) {
    throw new Error(`Personas path not found: ${path}`);
  }
  const stat = statSync(path);
  let personas = [];
  if (stat.isDirectory()) {
    const files = readdirSync(path).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const parsed = JSON.parse(readFileSync(join(path, f), "utf-8"));
      personas.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    }
  } else {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    personas = Array.isArray(parsed) ? parsed : [parsed];
  }
  return personas;
}

// ── Preflight: is the real ADAM_SYSTEM_PROMPT path reachable? ────────────
async function preflightCheckLiveMode() {
  const res = await fetch(`${BASE_URL}/api/bot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "בדיקת preflight — האם המסלול האמיתי פעיל?" }],
      currentState: "DIAGNOSING",
      collectedData: { serviceModel: "field", turnIndex: 0 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data.isSimulation !== false; // true = simulation stub, false = real Gemini path
}

// ── Puppeteer helpers ─────────────────────────────────────────────────────
async function clickButtonByText(page, text, { exact = false } = {}) {
  return page.evaluate(
    (text, exact) => {
      const buttons = [...document.querySelectorAll("button")];
      const btn = buttons.find((b) => {
        const t = (b.textContent || "").trim();
        return exact ? t === text : t.includes(text);
      });
      if (!btn || btn.disabled) return false;
      btn.click();
      return true;
    },
    text,
    exact
  );
}

async function getLastAssistantMessage(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-chat-role="assistant"]')];
    const last = nodes[nodes.length - 1];
    return last ? last.textContent.trim() : null;
  });
}

async function getMessageCounts(page) {
  return page.evaluate(() => ({
    user: document.querySelectorAll('[data-chat-role="user"]').length,
    assistant: document.querySelectorAll('[data-chat-role="assistant"]').length,
  }));
}

async function waitForBotSettle(networkLog, sinceCount, { timeoutMs = 45000, quietMs = 1200 } = {}) {
  const start = Date.now();
  let lastCount = networkLog.length;
  let lastNewAt = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(200);
    if (networkLog.length > sinceCount) {
      if (networkLog.length !== lastCount) {
        lastCount = networkLog.length;
        lastNewAt = Date.now();
      }
      if (Date.now() - lastNewAt > quietMs) {
        return { timedOut: false, events: networkLog.slice(sinceCount) };
      }
    }
  }
  return { timedOut: true, events: networkLog.slice(sinceCount) };
}

// ── Run a single persona end-to-end through the real UI ──────────────────
async function runPersona(browser, persona, runIndex) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `run-${persona.id}-${timestamp}`;
  const shotDir = join(OUTPUT_DIR, runId);
  mkdirSync(shotDir, { recursive: true });

  const transcript = {
    personaId: persona.id,
    vertical: persona.vertical,
    deliveryModelButton: persona.deliveryModelButton,
    paymentMode: persona.paymentMode,
    expectedEarlyTermination: persona.expectedEarlyTermination ?? false,
    terminationReason: persona.terminationReason ?? null,
    startedAt: new Date().toISOString(),
    findings: [], // loud, non-editorial notes about friction/bugs observed
    turns: [],
    finishedAt: null,
    status: "in-progress", // driver-level only: "completed" | "error" — NOT a pass/fail grade
  };

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Capture every /api/bot (and related) response verbatim — this is the
  // ground truth for currentState/collectedData/isSimulation, far more
  // reliable than scraping React-rendered DOM state.
  const networkLog = [];
  page.on("response", async (res) => {
    try {
      const url = res.request().url();
      const method = res.request().method();
      if (
        method === "POST" &&
        (url.includes("/api/bot") ||
          url.includes("/api/upload") ||
          url.includes("/api/checkout") ||
          url.includes("/api/lp-generate") ||
          url.includes("/api/cloudflare-pages/deploy") ||
          url.includes("/api/google-ads/create-campaign") ||
          url.includes("/api/lead"))
      ) {
        const json = await res.json().catch(() => null);
        networkLog.push({ url, status: res.status(), json, capturedAt: new Date().toISOString() });
      }
    } catch {
      // non-fatal — response body capture is best-effort evidence, not a gate
    }
  });

  const screenshot = async (label) => {
    const file = join(shotDir, `${String(transcript.turns.length).padStart(2, "0")}-${label}.png`);
    await page.screenshot({ path: file }).catch(() => {});
    return file;
  };

  try {
    await page.goto(`${BASE_URL}/google-ads/onboarding`, { waitUntil: "networkidle0", timeout: 30000 });
    await sleep(500);
    const shot0 = await screenshot("page-loaded");
    transcript.turns.push({ turn: 0, type: "page-load", screenshot: shot0, note: "onboarding page loaded" });

    // ── Delivery-model selection (mandatory first step) ──────────────────
    let deliveryValue = persona.deliveryModelButton;
    if (!DELIVERY_LABELS[deliveryValue]) {
      transcript.findings.push(
        `deliveryModelButton "${deliveryValue}" has no UI button (known bug: prompts.ts defines an "event" serviceModel branch but delivery-model.js has no "event" option). Falling back to "mixed" to keep the run moving — this is intentional test data per the mission scope, not a driver decision to "fix" anything.`
      );
      deliveryValue = "mixed";
    }
    const deliveryLabel = DELIVERY_LABELS[deliveryValue];
    const sinceDelivery = networkLog.length;
    const clickedDelivery = await clickButtonByText(page, deliveryLabel, { exact: false });
    if (!clickedDelivery) {
      throw new Error(`Delivery-model button not found for label "${deliveryLabel}"`);
    }
    await sleep(600);
    const shotDelivery = await screenshot("delivery-model-selected");
    transcript.turns.push({
      turn: "delivery-model",
      type: "delivery-model",
      requestedValue: persona.deliveryModelButton,
      clickedLabel: deliveryLabel,
      screenshot: shotDelivery,
    });

    // ── Drive scripted turns ──────────────────────────────────────────────
    for (let i = 0; i < persona.turns.length; i++) {
      const t = persona.turns[i];

      if (t.type === "skip") {
        transcript.turns.push({ turn: i + 1, type: "skip", reason: t.reason });
        continue;
      }

      if (t.type === "text") {
        const before = await getMessageCounts(page);
        const sinceCount = networkLog.length;

        const inputSel = 'input[type="text"][aria-describedby="onboarding-input-helper"]';
        await page.waitForSelector(inputSel, { timeout: 10000 });
        await page.click(inputSel);
        // Clear any residual value defensively before typing.
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.value = "";
        }, inputSel);
        await page.type(inputSel, t.value, { delay: 8 });

        const clickedSend = await clickButtonByText(page, SEND_BUTTON_TEXT, { exact: true });
        if (!clickedSend) {
          transcript.turns.push({
            turn: i + 1,
            type: "text",
            input: t.value,
            error: "Send button not found or disabled — input may have been rejected by the form guard.",
            screenshot: await screenshot(`turn-${i + 1}-send-failed`),
          });
          continue;
        }

        const { timedOut, events } = await waitForBotSettle(networkLog, sinceCount);
        const after = await getMessageCounts(page);
        const assistantReply = await getLastAssistantMessage(page);
        const shot = await screenshot(`turn-${i + 1}`);

        const lastBotEvent = [...events].reverse().find((e) => e.url.includes("/api/bot"));

        transcript.turns.push({
          turn: i + 1,
          type: "text",
          input: t.value,
          assistantResponse: assistantReply,
          messageCountsBefore: before,
          messageCountsAfter: after,
          currentState: lastBotEvent?.json?.currentState ?? null,
          collectedData: lastBotEvent?.json?.collectedData ?? null,
          isSimulation: lastBotEvent?.json?.isSimulation ?? null,
          networkEvents: events.map((e) => ({ url: e.url, status: e.status })),
          timedOut,
          screenshot: shot,
        });

        if (timedOut) {
          transcript.findings.push(
            `Turn ${i + 1} ("${t.value.slice(0, 40)}…") — no settled /api/bot response within timeout. Possible stuck state or slow LLM round-trip. See screenshot ${shot}.`
          );
        }
        continue;
      }

      if (t.type === "file_upload") {
        const filePath = resolve(ROOT, t.filePath);
        if (!existsSync(filePath)) {
          transcript.turns.push({
            turn: i + 1,
            type: "file_upload",
            error: `File not found at ${filePath}`,
          });
          continue;
        }
        const sinceCount = networkLog.length;
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser({ timeout: 10000 }),
          clickButtonByText(page, "📎", { exact: false }),
        ]);
        await fileChooser.accept([filePath]);

        const { timedOut, events } = await waitForBotSettle(networkLog, sinceCount);
        const assistantReply = await getLastAssistantMessage(page);
        const shot = await screenshot(`turn-${i + 1}-upload`);
        const lastBotEvent = [...events].reverse().find((e) => e.url.includes("/api/bot"));
        const uploadEvent = events.find((e) => e.url.includes("/api/upload"));

        transcript.turns.push({
          turn: i + 1,
          type: "file_upload",
          filePath: t.filePath,
          uploadedUrls: uploadEvent?.json?.urls ?? null,
          assistantResponse: assistantReply,
          currentState: lastBotEvent?.json?.currentState ?? null,
          collectedData: lastBotEvent?.json?.collectedData ?? null,
          isSimulation: lastBotEvent?.json?.isSimulation ?? null,
          timedOut,
          screenshot: shot,
        });
        continue;
      }

      transcript.turns.push({ turn: i + 1, type: t.type, error: `Unknown turn type "${t.type}"` });
    }

    // ── REVIEWING state — approve + payment path ─────────────────────────
    const shotReviewing = await screenshot("reviewing-state-reached");
    transcript.turns.push({ turn: "pre-approval", type: "state-check", screenshot: shotReviewing });

    const checkboxSel = 'input[type="checkbox"]';
    const hasCheckbox = await page.$(checkboxSel);

    // ── Personas 3 (locksmith) & 4 (pest control) are SCRIPTED to terminate
    //    before REVIEWING/payment (locksmith redirect rule / capacity soft-
    //    stop gate). For these, NOT reaching the checkbox is the expected
    //    PASS shape, not a driver error — do not log it as a "finding" (which
    //    downstream grading may read as friction/failure evidence). If the
    //    checkbox unexpectedly DOES appear for one of these personas, that is
    //    itself a real finding: the redirect/soft-stop logic failed to hold.
    if (persona.expectedEarlyTermination) {
      if (hasCheckbox) {
        transcript.findings.push(
          `UNEXPECTED: persona ${persona.id} was scripted to terminate before REVIEWING (${persona.terminationReason ?? "see personas file"}), but the REVIEWING checkbox was found on the page. This is a FAIL of the redirect/soft-stop gate this persona exists to test — not a driver artifact.`
        );
      } else {
        transcript.turns.push({
          turn: "expected-early-termination",
          type: "early-termination-check",
          expected: true,
          reason: persona.terminationReason ?? null,
          note: "REVIEWING checkbox not found, as scripted — this run is designed to terminate in DIAGNOSING before payment. Treat as PASS for the gate being tested, not as a driver error.",
        });
      }
    } else if (!hasCheckbox) {
      transcript.findings.push(
        "REVIEWING checkbox not found on page — either the conversation never reached REVIEWING (see last turn's currentState) or the terms checkbox selector changed."
      );
    } else {
      await page.click(checkboxSel);
      await sleep(300);

      if (persona.paymentMode === "bypass") {
        const sinceCount = networkLog.length;
        const clicked = await clickButtonByText(page, BYPASS_BUTTON_TEXT, { exact: false });
        if (!clicked) {
          transcript.findings.push(
            `Bypass button "${BYPASS_BUTTON_TEXT}" not found/disabled. Confirm NEXT_PUBLIC_PAYMENT_BYPASS=true is set and the dev server was started/restarted after that env var was set.`
          );
        } else {
          const { timedOut, events } = await waitForBotSettle(networkLog, sinceCount, { timeoutMs: 60000, quietMs: 1500 });
          const shot = await screenshot("post-bypass-completed");
          transcript.turns.push({
            turn: "approval-bypass",
            type: "approval",
            mode: "bypass",
            networkEvents: events.map((e) => ({ url: e.url, status: e.status })),
            timedOut,
            screenshot: shot,
          });
        }
      } else if (persona.paymentMode === "full") {
        const sinceCount = networkLog.length;
        const clicked = await clickButtonByText(page, APPROVE_BUTTON_TEXT, { exact: false });
        if (!clicked) {
          transcript.findings.push(`Approve/pay button "${APPROVE_BUTTON_TEXT}" not found/disabled.`);
        } else {
          // handleApprove() posts to /api/checkout then does window.location.href
          // to the sandbox redirect — wait for that navigation.
          await page
            .waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 })
            .catch(() => {
              transcript.findings.push("Expected navigation to /checkout/yaad-sandbox did not occur within timeout.");
            });
          const shotSandbox = await screenshot("yaad-sandbox-page");

          const onSandbox = page.url().includes("yaad-sandbox");
          transcript.turns.push({
            turn: "checkout-redirect",
            type: "approval",
            mode: "full",
            landedUrl: page.url(),
            onSandboxPage: onSandbox,
            screenshot: shotSandbox,
          });

          if (onSandbox) {
            // Fill the sandbox card form with obviously-fake test data and submit.
            await page.type('input[type="text"]', "Test Persona", { delay: 5 }).catch(() => {});
            const textInputs = await page.$$('input[type="text"]');
            if (textInputs[1]) await textInputs[1].type("4111111111111111", { delay: 5 });
            if (textInputs[2]) await textInputs[2].type("12/30", { delay: 5 });
            if (textInputs[3]) await textInputs[3].type("123", { delay: 5 });

            const sinceCheckoutSubmit = networkLog.length;
            const paySubmitted = await clickButtonByText(page, YAAD_PAY_BUTTON_TEXT, { exact: false });
            if (!paySubmitted) {
              transcript.findings.push("Sandbox 'pay' submit button not found on yaad-sandbox page.");
            } else {
              await page
                .waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 })
                .catch(() => {
                  transcript.findings.push("Expected redirect back to /google-ads/onboarding?payment=success did not occur.");
                });
              const { timedOut, events } = await waitForBotSettle(networkLog, sinceCheckoutSubmit, {
                timeoutMs: 60000,
                quietMs: 1500,
              });
              const shotFinal = await screenshot("post-checkout-completed");
              transcript.turns.push({
                turn: "checkout-completed",
                type: "approval",
                mode: "full",
                landedUrl: page.url(),
                networkEvents: events.map((e) => ({ url: e.url, status: e.status })),
                timedOut,
                screenshot: shotFinal,
              });
            }
          }
        }
      } else {
        transcript.findings.push(`Unknown paymentMode "${persona.paymentMode}" — expected "full" or "bypass".`);
      }
    }

    const shotFinal = await screenshot("run-end");
    transcript.turns.push({ turn: "final", type: "final-state", url: page.url(), screenshot: shotFinal });
    transcript.status = "completed";
  } catch (err) {
    transcript.status = "error";
    transcript.error = { message: err.message, stack: err.stack };
    transcript.findings.push(`Run aborted with an error: ${err.message}`);
    await screenshot("error-state").catch(() => {});
  } finally {
    transcript.finishedAt = new Date().toISOString();
    transcript.rawNetworkLog = networkLog; // full evidence trail, unfiltered
    const outFile = join(OUTPUT_DIR, `${runId}.json`);
    writeFileSync(outFile, JSON.stringify(transcript, null, 2), "utf-8");
    console.log(`[persona ${persona.id}] ${transcript.status} → ${outFile}`);
    await page.close().catch(() => {});
  }

  return transcript;
}

// ── Main batch ─────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Loading personas from ${PERSONAS_PATH} ...`);
  let personas = loadPersonas(PERSONAS_PATH);
  if (ONLY_ID) personas = personas.filter((p) => String(p.id) === String(ONLY_ID));
  if (!personas.length) {
    console.error("No personas matched — nothing to run.");
    process.exit(1);
  }
  console.log(`Loaded ${personas.length} persona(s).`);

  console.log("Running preflight check against /api/bot ...");
  const isSimulation = await preflightCheckLiveMode();
  if (isSimulation) {
    console.log(
      "\n⚠️  PREFLIGHT: /api/bot is returning isSimulation:true. The real ADAM_SYSTEM_PROMPT\n" +
        "logic in src/lib/bot/prompts.ts is NOT reachable — src/app/api/bot/route.ts falls\n" +
        "through to handleSimulation() because GEMINI_API_KEY is not set (commented out\n" +
        "in .env.local as of this writing). Running the full 18-persona batch against the\n" +
        "stub would defeat the purpose of this exercise (surfacing real conversational\n" +
        "friction).\n\n" +
        "Fix: uncomment GEMINI_API_KEY in .env.local and restart `npm run dev`, then re-run.\n\n"
    );
    if (!ALLOW_SIMULATION) {
      console.error("Aborting. Pass --allow-simulation to proceed anyway (driver self-test only).");
      process.exit(1);
    }
    console.log("--allow-simulation passed — proceeding against the simulation stub.\n");
  } else {
    console.log("Preflight OK — isSimulation:false, the real Gemini/ADAM_SYSTEM_PROMPT path is live.\n");
  }

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    console.log(`\n=== Persona ${persona.id} (${persona.vertical}) — ${i + 1}/${personas.length} ===`);
    try {
      const transcript = await runPersona(browser, persona, i);
      results.push({ id: persona.id, status: transcript.status });
    } catch (err) {
      // runPersona already catches internally and writes a transcript; this
      // is a last-resort guard so one exploded persona never kills the batch.
      console.error(`[persona ${persona.id}] fatal driver error, moving to next persona:`, err.message);
      results.push({ id: persona.id, status: "driver-error", error: err.message });
    }
  }

  await browser.close();

  console.log("\n=== Batch summary (driver-level status only — NOT a PASS/FAIL grade) ===");
  for (const r of results) console.log(`  persona ${r.id}: ${r.status}`);
  console.log(`\nTranscripts + screenshots written under ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
