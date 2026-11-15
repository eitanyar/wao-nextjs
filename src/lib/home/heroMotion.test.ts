// State machine of the homepage hero motion controller (start conditions, skip/Esc, replay, reduced-motion bail).
// Fakes stand in for the DOM; timers are manual. HEBREW-SAFETY: zero Hebrew bytes.
import assert from "node:assert/strict";
import test from "node:test";
import { HERO_MOTION_IFRAME_DEADLINE_MS, startHeroMotion } from "./heroMotion";

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
  get offsetWidth() { this.reflows++; return 100; }
  setAttribute(n: string, v: string) { this.attrs.set(n, v); }
  getAttribute(n: string) { return this.attrs.get(n) ?? null; }
  removeAttribute(n: string) { this.attrs.delete(n); }
}

function setup(opts: { reduce?: boolean; frameLoaded?: boolean; docComplete?: boolean; noIdle?: boolean } = {}) {
  const root = new FakeEl();
  root.setAttribute("data-motion", "rest");
  const button = new FakeEl();
  const pointer = new FakeEl();
  const scene = new FakeEl();
  const frame = Object.assign(new FakeTarget(), {
    contentDocument: opts.frameLoaded ? { readyState: "complete", URL: "http://x/hero-window/lp" } : { readyState: "complete", URL: "about:blank" },
  });
  const map: Record<string, unknown> = { "[data-hm-button]": button, "[data-hm-scene]": scene, iframe: frame, "[data-hm-pointer]": pointer };
  Object.assign(root, { querySelector: (s: string) => map[s] ?? null });
  const mq = Object.assign(new FakeTarget(), { matches: !!opts.reduce });
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;
  let ioCb: ((e: { intersectionRatio: number }[]) => void) | undefined;
  let ioDisconnected = false;
  const idle: (() => void)[] = [];
  const doc = Object.assign(new FakeTarget(), { readyState: opts.docComplete ? "complete" : "loading" });
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
  const dispose = startHeroMotion(root as never, win as never, { skip: "SKIP", replay: "REPLAY" });
  const env = {
    root, button, pointer, frame, mq, win, doc, timers, dispose,
    state: () => root.getAttribute("data-motion"),
    load: () => { doc.readyState = "complete"; win.fire("load"); },
    idle: () => { while (idle.length) idle.shift()!(); },
    view: (ratio: number) => ioCb!([{ intersectionRatio: ratio }]),
    frameLoad: () => { frame.contentDocument = { readyState: "complete", URL: "http://x/hero-window/lp" }; frame.fire("load"); },
    runTimers: (ms?: number) => { for (const [id, t] of [...timers]) if (ms === undefined || t.ms === ms) { timers.delete(id); t.fn(); } },
    ioDisconnected: () => ioDisconnected,
  };
  return env;
}

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
  t.view(1);
  t.idle();
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
  t.idle();
  t.view(1);
  assert.equal(t.state(), "rest");
  t.runTimers(HERO_MOTION_IFRAME_DEADLINE_MS);
  t.frameLoad();
  t.view(0.9);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
});

test("the pointer's animationend returns to rest; children's animationend does not", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  t.idle(); t.view(1);
  t.pointer.fire("animationend", { target: {} });
  assert.equal(t.state(), "playing");
  t.pointer.fire("animationend", { target: t.pointer });
  assert.equal(t.state(), "rest");
  assert.equal(t.button.getAttribute("aria-label"), "REPLAY");
  assert.equal(t.button.hidden, false, "replay stays available");
});

test("skip button and Esc go to rest; other keys do nothing", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  t.idle(); t.view(1);
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
  t.idle(); t.view(1);
  t.button.fire("click");
  const before = t.root.reflows;
  t.button.fire("click");
  assert.equal(t.state(), "playing");
  assert.equal(t.root.reflows, before + 1);
});

test("reduced motion: never plays, the button stays hidden", () => {
  const t = setup({ reduce: true, docComplete: true, frameLoaded: true });
  t.idle(); t.view(1);
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
  t.button.fire("click");
  assert.equal(t.state(), "rest");
});

test("reduced motion switched on mid-play bails to rest and hides the button; off again restores it", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  t.idle(); t.view(1);
  t.mq.matches = true; t.mq.fire("change");
  assert.equal(t.state(), "rest");
  assert.equal(t.button.hidden, true);
  t.mq.matches = false; t.mq.fire("change");
  assert.equal(t.button.hidden, false);
  assert.equal(t.state(), "rest", "does not auto-replay");
});

test("dispose removes every listener", () => {
  const t = setup({ docComplete: true, frameLoaded: true });
  t.dispose();
  for (const target of [t.button, t.pointer, t.frame, t.mq, t.doc, t.win]) assert.equal(target.count(), 0);
});
