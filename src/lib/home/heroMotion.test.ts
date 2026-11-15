// State machine of the homepage hero motion controller: start conditions, skip/Esc, replay, reduced-motion bail
// (one entry), and the showcase loop (two or more entries + pause/play labels): rest, lazy next iframe, cross-fade,
// pause/play, Esc, visibility, reduced motion. Fakes stand in for the DOM; timers are manual.
// HEBREW-SAFETY: zero Hebrew bytes.
import assert from "node:assert/strict";
import test from "node:test";
import { HERO_MOTION_IFRAME_DEADLINE_MS, HERO_MOTION_LOOP_REST_MS, startHeroMotion } from "./heroMotion";

type Fn = (e: { key?: string; target?: unknown }) => void;

class FakeTarget {
  listeners = new Map<string, Set<Fn>>();
  addEventListener(type: string, fn: Fn) { (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)!).add(fn); }
  removeEventListener(type: string, fn: Fn) { this.listeners.get(type)?.delete(fn); }
  fire(type: string, e: { key?: string; target?: unknown } = {}) { for (const fn of [...(this.listeners.get(type) ?? [])]) fn(e); }
  count() { let n = 0; for (const s of this.listeners.values()) n += s.size; return n; }
}
class FakeEl extends FakeTarget {
  attrs = new Map<string, string>();
  hidden = true;
  reflows = 0;
  children: Record<string, unknown> = {};
  contentDocument?: { readyState: string; URL: string };
  get offsetWidth() { this.reflows++; return 100; }
  setAttribute(n: string, v: string) { this.attrs.set(n, v); }
  getAttribute(n: string) { return this.attrs.get(n) ?? null; }
  removeAttribute(n: string) { this.attrs.delete(n); }
  hasAttribute(n: string) { return this.attrs.has(n); }
  querySelector(s: string) { return this.children[s] ?? null; }
}

const LOADED = { readyState: "complete", URL: "http://x/hero-window/lp/a" };
const BLANK = { readyState: "complete", URL: "about:blank" };

function setup(opts: { reduce?: boolean; frameLoaded?: boolean; docComplete?: boolean; noIdle?: boolean; entries?: number; loopLabels?: boolean } = {}) {
  const n = opts.entries ?? 1;
  const root = new FakeEl();
  root.setAttribute("data-motion", "rest");
  const button = new FakeEl();
  const scene = new FakeEl();
  const entries = Array.from({ length: n }, (_, i) => {
    const entry = new FakeEl();
    const frame = new FakeEl();
    frame.contentDocument = i === 0 && opts.frameLoaded ? LOADED : BLANK;
    if (i === 0) frame.setAttribute("src", "/lp/0"); else frame.setAttribute("data-src", `/lp/${i}`);
    if (i === 0) entry.setAttribute("data-active", "");
    const pointer = new FakeEl();
    entry.children = { iframe: frame, "[data-hm-pointer]": pointer };
    return entry;
  });
  Object.assign(root, {
    querySelector: (s: string) => ({ "[data-hm-button]": button, "[data-hm-scene]": scene } as Record<string, unknown>)[s] ?? null,
    querySelectorAll: (s: string) => (s === "[data-hm-entry]" ? entries : []),
  });
  const mq = Object.assign(new FakeTarget(), { matches: !!opts.reduce });
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;
  let ioCb: ((e: { intersectionRatio: number }[]) => void) | undefined;
  let ioDisconnected = false;
  const idle: (() => void)[] = [];
  const doc = Object.assign(new FakeTarget(), { readyState: opts.docComplete ? "complete" : "loading", hidden: false });
  const win = Object.assign(new FakeTarget(), {
    document: doc,
    matchMedia: () => mq,
    setTimeout: (fn: () => void, ms: number) => { timers.set(nextId, { fn, ms }); return nextId++; },
    clearTimeout: (id: number) => { timers.delete(id); },
    requestIdleCallback: opts.noIdle ? undefined : (fn: () => void) => { idle.push(fn); return 1; },
    IntersectionObserver: class {
      constructor(cb: (e: { intersectionRatio: number }[]) => void) { ioCb = cb; }
      observe() {}
      disconnect() { ioDisconnected = true; }
    },
  });
  const labels = { skip: "SKIP", replay: "REPLAY", ...(opts.loopLabels === false ? {} : { pause: "PAUSE", play: "PLAY" }) };
  const dispose = startHeroMotion(root as never, win as never, labels);
  const frame = (i: number) => entries[i].children.iframe as FakeEl;
  const pointer = (i: number) => entries[i].children["[data-hm-pointer]"] as FakeEl;
  return {
    root, button, entries, mq, win, doc, timers, dispose, frame, pointer,
    state: () => root.getAttribute("data-motion"),
    active: () => entries.findIndex((e) => e.hasAttribute("data-active")),
    paused: () => root.hasAttribute("data-paused"),
    load: () => { doc.readyState = "complete"; win.fire("load"); },
    idle: () => { while (idle.length) idle.shift()!(); },
    view: (ratio: number) => ioCb!([{ intersectionRatio: ratio }]),
    frameLoad: (i = 0) => { frame(i).contentDocument = LOADED; frame(i).fire("load"); },
    end: (i: number) => root.fire("animationend", { target: pointer(i) }),
    runTimers: (ms?: number) => { for (const [id, t] of [...timers]) if (ms === undefined || t.ms === ms) { timers.delete(id); t.fn(); } },
    pending: (ms: number) => [...timers.values()].filter((t) => t.ms === ms).length,
    ioDisconnected: () => ioDisconnected,
  };
}
const startNow = (t: ReturnType<typeof setup>) => { t.idle(); t.view(1); };

// --- one entry: play once, rest, replay -------------------------------------------------------------------------

test("waits for load + idle, >= 60% in view and the iframe; then plays and shows the skip button", () => {
  const t = setup();
  t.load();
  t.frameLoad();
  t.view(0.7);
  assert.equal(t.state(), "rest", "not before idle");
  t.idle();
  assert.equal(t.state(), "playing");
  assert.equal(t.button.hidden, false);
  assert.equal(t.button.getAttribute("aria-label"), "SKIP");
  assert.ok(t.ioDisconnected());
});

test("does not start below 60% in view, starts once it scrolls in", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  t.idle();
  t.view(0.59);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
  t.view(0.6);
  assert.equal(t.state(), "playing");
});

test("an iframe already loaded before the controller mounted counts as loaded", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  startNow(t);
  assert.equal(t.state(), "playing");
});

test("no requestIdleCallback: falls back to a 1200 ms timer after load", () => {
  const t = setup({ noIdle: true, frameLoaded: true });
  t.view(1);
  t.load();
  assert.equal(t.state(), "rest");
  t.runTimers(1200);
  assert.equal(t.state(), "playing");
});

test("iframe not loaded 3 s after the other conditions: never plays, even if it loads later", () => {
  const t = setup({ docComplete: true });
  startNow(t);
  assert.equal(t.state(), "rest");
  t.runTimers(HERO_MOTION_IFRAME_DEADLINE_MS);
  t.frameLoad();
  t.view(0.9);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
});

test("the active pointer's animationend returns to rest; other animationends do not", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  startNow(t);
  t.root.fire("animationend", { target: {} });
  assert.equal(t.state(), "playing");
  t.end(0);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.getAttribute("aria-label"), "REPLAY");
  assert.equal(t.button.hidden, false, "replay stays available");
  assert.equal(t.pending(HERO_MOTION_LOOP_REST_MS), 0, "one entry never loops");
});

test("skip button and Esc go to rest; other keys do nothing", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  startNow(t);
  t.doc.fire("keydown", { key: "Enter" });
  assert.equal(t.state(), "playing");
  t.doc.fire("keydown", { key: "Escape" });
  assert.equal(t.state(), "rest");
  t.button.fire("click");
  assert.equal(t.state(), "playing", "click at rest = replay");
  t.button.fire("click");
  assert.equal(t.state(), "rest", "click while playing = skip");
});

test("replay removes the attribute, forces a reflow, then re-adds playing", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  startNow(t);
  t.button.fire("click");
  const before = t.root.reflows;
  t.button.fire("click");
  assert.equal(t.state(), "playing");
  assert.equal(t.root.reflows, before + 1);
});

test("reduced motion: never plays, the button stays hidden", () => {
  const t = setup({ reduce: true, docComplete: true, frameLoaded: true });
  startNow(t);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
  t.button.fire("click");
  assert.equal(t.state(), "rest");
});

test("reduced motion switched on mid-play bails to rest and hides the button; off again restores it", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  startNow(t);
  t.mq.matches = true; t.mq.fire("change");
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
  t.mq.matches = false; t.mq.fire("change");
  assert.equal(t.button.hidden, false);
  assert.equal(t.state(), "rest", "does not auto-replay");
});

test("dispose removes every listener", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2 });
  t.dispose();
  for (const target of [t.button, t.root, t.frame(0), t.mq, t.doc, t.win]) assert.equal(target.count(), 0);
});

// --- two or more entries: the showcase loop ---------------------------------------------------------------------

test("two entries without pause/play labels: the loop stays dormant (single-entry behaviour)", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2, loopLabels: false });
  startNow(t);
  t.end(0);
  assert.equal(t.state(), "rest");
  assert.equal(t.pending(HERO_MOTION_LOOP_REST_MS), 0);
  assert.equal(t.frame(1).getAttribute("src"), null, "next iframe never loaded");
  assert.equal(t.button.getAttribute("aria-label"), "REPLAY");
});

test("loop: rest 4 s on the final frame, load only the next iframe during that rest, then cross-fade and play it", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 3 });
  startNow(t);
  assert.equal(t.state(), "playing");
  assert.equal(t.button.getAttribute("aria-label"), "PAUSE");
  assert.equal(t.frame(1).getAttribute("src"), null, "no other iframe loads at start");
  t.end(0);
  assert.equal(t.state(), "rest");
  assert.equal(t.frame(1).getAttribute("src"), "/lp/1", "next iframe loads during the rest");
  assert.equal(t.frame(2).getAttribute("src"), null, "never all at once");
  assert.equal(t.active(), 0);
  t.runTimers(HERO_MOTION_LOOP_REST_MS);
  assert.equal(t.active(), 0, "waits for the next page to load");
  t.frameLoad(1);
  assert.equal(t.active(), 1);
  assert.equal(t.state(), "playing");
  // An animationend from the inactive entry is ignored.
  t.end(0);
  assert.equal(t.state(), "playing");
  t.end(1);
  assert.equal(t.frame(2).getAttribute("src"), "/lp/2");
  t.frameLoad(2);
  t.runTimers(HERO_MOTION_LOOP_REST_MS);
  assert.equal(t.active(), 2);
  t.end(2);
  t.runTimers(HERO_MOTION_LOOP_REST_MS);
  assert.equal(t.active(), 0, "wraps around");
  assert.equal(t.state(), "playing");
});

test("loop: the button pauses and plays; a pause during rest cancels the cross-fade until play", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2 });
  startNow(t);
  t.button.fire("click");
  assert.ok(t.paused());
  assert.equal(t.button.getAttribute("aria-label"), "PLAY");
  assert.equal(t.state(), "playing", "paused in place (CSS animation-play-state), not skipped");
  t.button.fire("click");
  assert.ok(!t.paused());
  assert.equal(t.button.getAttribute("aria-label"), "PAUSE");
  t.end(0);
  assert.equal(t.pending(HERO_MOTION_LOOP_REST_MS), 1);
  t.button.fire("click");
  assert.equal(t.pending(HERO_MOTION_LOOP_REST_MS), 0, "no cross-fade while paused");
  t.button.fire("click");
  assert.equal(t.pending(HERO_MOTION_LOOP_REST_MS), 1, "rest restarts on play");
});

test("loop: Esc pauses (does not skip)", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2 });
  startNow(t);
  t.doc.fire("keydown", { key: "Escape" });
  assert.ok(t.paused());
  assert.equal(t.state(), "playing");
});

test("loop: pauses when out of view or the tab is hidden, resumes when back (unless the visitor paused)", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2 });
  startNow(t);
  assert.ok(!t.ioDisconnected(), "the loop keeps watching visibility");
  t.view(0.3);
  assert.ok(t.paused());
  t.view(0.8);
  assert.ok(!t.paused());
  t.doc.hidden = true; t.doc.fire("visibilitychange");
  assert.ok(t.paused());
  t.doc.hidden = false; t.doc.fire("visibilitychange");
  assert.ok(!t.paused());
  t.button.fire("click");
  t.view(0.3); t.view(0.9);
  assert.ok(t.paused(), "a visitor's pause sticks");
});

test("loop: reduced motion returns to the first entry's resting frame, no timers, no button", () => {
  const t = setup({ docComplete: true, frameLoaded: true, entries: 2 });
  startNow(t);
  t.end(0);
  t.frameLoad(1);
  t.runTimers(HERO_MOTION_LOOP_REST_MS);
  assert.equal(t.active(), 1);
  t.mq.matches = true; t.mq.fire("change");
  assert.equal(t.active(), 0);
  assert.equal(t.state(), "rest");
  assert.ok(!t.paused());
  assert.equal(t.button.hidden, true);
  assert.equal(t.timers.size, 0);
});

test("loop with reduced motion from the start: first entry only, nothing loads", () => {
  const t = setup({ reduce: true, docComplete: true, frameLoaded: true, entries: 2 });
  startNow(t);
  assert.equal(t.state(), "rest");
  assert.equal(t.active(), 0);
  assert.equal(t.frame(1).getAttribute("src"), null);
});
