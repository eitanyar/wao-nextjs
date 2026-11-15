// Homepage hero motion controller (docs/specs/hero-motion-spec-maya-2026-11-15.md §1 + the showcase loop, Eitan
// 2026-11-15). The animation itself is CSS keyframes (src/components/home/heroMotion.module.css, generated); this only
// flips attributes: data-motion="rest|playing" and data-paused on the wrapper, data-active on one showcase entry.
// No per-frame JS. HEBREW-SAFETY: this module contains ZERO Hebrew bytes (labels are passed in).
//
// Start = window load + idle (requestIdleCallback, 1200 ms fallback) AND >= 60% of the scene in view AND the first
// entry's iframe has loaded. If that iframe has not loaded 3 s after the other two hold, it never plays.
// One entry: plays once; ends on the pointer's animationend, Esc or the skip button; the button then replays.
// Two or more entries (and pause/play labels): plays entry 1, rests 4 s on its final frame, cross-fades to the next
// entry (whose iframe src is set during the previous rest, never all at once), and loops while >= 60% in view and the
// tab is visible. The button pauses/plays; Esc pauses. Reduced motion: never plays (first entry's resting frame).

export type HeroMotionState = "rest" | "playing";

export interface HeroMotionLabels {
  skip: string;
  replay: string;
  /** Loop mode only; without both, the loop stays dormant (single-entry behaviour). */
  pause?: string;
  play?: string;
}

export const HERO_MOTION_IFRAME_DEADLINE_MS = 3000;
export const HERO_MOTION_IDLE_FALLBACK_MS = 1200;
export const HERO_MOTION_IN_VIEW = 0.6;
export const HERO_MOTION_LOOP_REST_MS = 4000;

/** The DOM the controller expects inside the wrapper (selectors shared with HeroScene.tsx). */
export const HERO_MOTION_SELECTORS = { button: "[data-hm-button]", scene: "[data-hm-scene]", entry: "[data-hm-entry]", pointer: "data-hm-pointer" } as const;

type Listener = (event: { key?: string; target?: unknown }) => void;
interface Target { addEventListener(type: string, fn: Listener, opts?: unknown): void; removeEventListener(type: string, fn: Listener): void }
interface El extends Target { setAttribute(n: string, v: string): void; getAttribute(n: string): string | null; removeAttribute(n: string): void; hasAttribute(n: string): boolean }
interface Frame extends El { readonly contentDocument?: { readyState: string; URL: string } | null }
interface Entry extends El { querySelector(sel: string): unknown }
interface Root extends El { readonly offsetWidth: number; querySelector(sel: string): unknown; querySelectorAll(sel: string): ArrayLike<unknown> }
interface Button extends El { hidden: boolean }
interface Win extends Target {
  document: Target & { readyState: string; hidden?: boolean };
  matchMedia(q: string): Target & { matches: boolean };
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
  IntersectionObserver?: new (cb: (entries: { intersectionRatio: number }[]) => void, opts: { threshold: number[] }) => { observe(el: unknown): void; disconnect(): void };
}

/** True once the iframe holds its real document (a lazy or src-less iframe reports about:blank). */
function frameLoaded(frame: Frame | null): boolean {
  try {
    const doc = frame?.contentDocument;
    return !!doc && doc.readyState === "complete" && doc.URL !== "about:blank";
  } catch {
    return false;
  }
}

/** Wires the controller to a rendered wrapper; returns a disposer. */
export function startHeroMotion(root: Root, win: Win, labels: HeroMotionLabels): () => void {
  const button = root.querySelector(HERO_MOTION_SELECTORS.button) as Button | null;
  const scene = root.querySelector(HERO_MOTION_SELECTORS.scene);
  const entries = Array.from(root.querySelectorAll(HERO_MOTION_SELECTORS.entry)) as Entry[];
  if (!button || !scene || !entries.length) return () => {};
  const frameOf = (i: number) => entries[i].querySelector("iframe") as Frame | null;
  const loop = entries.length > 1 && !!labels.pause && !!labels.play;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  const doc = win.document;
  let idle = false, seen = false, loaded = frameLoaded(frameOf(0)), expired = false, started = false, userPaused = false;
  let idx = 0;
  let deadline: number | undefined, restTimer: number | undefined;
  let io: { disconnect(): void } | undefined;
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => { const id = win.setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const motion = () => root.getAttribute("data-motion");
  const running = () => started && !userPaused && seen && !doc.hidden && !reduce.matches;

  const label = () => {
    const paused = root.hasAttribute("data-paused");
    button.setAttribute("aria-label", loop ? (paused ? labels.play! : labels.pause!) : motion() === "playing" ? labels.skip : labels.replay);
  };
  const set = (state: HeroMotionState) => { root.setAttribute("data-motion", state); label(); };
  const play = () => {
    if (reduce.matches) return;
    root.removeAttribute("data-motion");
    void root.offsetWidth; // reflow, so re-adding the attribute restarts every keyframe from 0
    set("playing");
    button.hidden = false;
  };
  const rest = () => { if (motion() === "playing") set("rest"); };

  // Loop: after an entry's rest, load the next entry's iframe (set during this rest only), then cross-fade to it.
  const next = () => (idx + 1) % entries.length;
  const preload = (i: number) => {
    const f = frameOf(i);
    const src = f?.getAttribute("data-src");
    if (f && src && !f.getAttribute("src")) f.setAttribute("src", src);
  };
  const advance = () => {
    restTimer = undefined;
    if (!running()) return;
    const n = next(), f = frameOf(n);
    if (f && !frameLoaded(f)) { f.addEventListener("load", advance, { once: true }); return; }
    entries[idx].removeAttribute("data-active");
    idx = n;
    entries[idx].setAttribute("data-active", "");
    play();
  };
  const scheduleRest = () => {
    if (loop && running() && motion() === "rest" && restTimer === undefined) {
      preload(next());
      restTimer = later(advance, HERO_MOTION_LOOP_REST_MS);
    }
  };
  /** Loop mode: pause (CSS animation-play-state + no timers) whenever it should not be running. */
  const sync = () => {
    if (!loop || !started) return;
    if (running()) { root.removeAttribute("data-paused"); scheduleRest(); }
    else {
      root.setAttribute("data-paused", "");
      if (restTimer !== undefined) { win.clearTimeout(restTimer); timers.delete(restTimer); restTimer = undefined; }
    }
    label();
  };
  const check = () => {
    sync();
    if (started || expired || reduce.matches || !idle || !seen) return;
    if (loaded) {
      started = true;
      if (deadline !== undefined) win.clearTimeout(deadline);
      if (!loop) io?.disconnect();
      play();
      sync();
    } else if (deadline === undefined) {
      deadline = win.setTimeout(() => { expired = !loaded; check(); }, HERO_MOTION_IFRAME_DEADLINE_MS);
    }
  };

  const onFrame: Listener = () => { if (!expired) { loaded = true; check(); } };
  const onIdle = () => { idle = true; check(); };
  const onLoad: Listener = () => {
    if (win.requestIdleCallback) win.requestIdleCallback(onIdle, { timeout: HERO_MOTION_IDLE_FALLBACK_MS });
    else later(onIdle, HERO_MOTION_IDLE_FALLBACK_MS);
  };
  const onKey: Listener = (e) => {
    if (e.key !== "Escape") return;
    if (loop) { if (started) { userPaused = true; sync(); } } else rest();
  };
  const onClick: Listener = () => {
    if (loop) { userPaused = !userPaused; sync(); }
    else if (motion() === "playing") rest();
    else play();
  };
  const onEnd: Listener = (e) => {
    if (e.target !== entries[idx].querySelector(`[${HERO_MOTION_SELECTORS.pointer}]`)) return; // the active entry's pointer only
    rest();
    scheduleRest();
  };
  const onVisibility: Listener = () => sync();
  const onReduce: Listener = () => {
    if (reduce.matches) {
      for (const id of timers) win.clearTimeout(id);
      timers.clear();
      restTimer = undefined;
      root.removeAttribute("data-paused");
      if (idx !== 0) { entries[idx].removeAttribute("data-active"); idx = 0; entries[0].setAttribute("data-active", ""); }
      rest();
      button.hidden = true;
    } else if (started) { button.hidden = false; sync(); }
    else check();
  };

  const first = frameOf(0);
  first?.addEventListener("load", onFrame);
  button.addEventListener("click", onClick);
  root.addEventListener("animationend", onEnd);
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("visibilitychange", onVisibility);
  reduce.addEventListener("change", onReduce);
  if (win.IntersectionObserver) {
    const observer = new win.IntersectionObserver((list) => {
      seen = list.some((e) => e.intersectionRatio >= HERO_MOTION_IN_VIEW);
      check();
    }, { threshold: [HERO_MOTION_IN_VIEW] });
    observer.observe(scene);
    io = observer;
  } else seen = true;
  if (doc.readyState === "complete") onLoad({});
  else win.addEventListener("load", onLoad);

  return () => {
    io?.disconnect();
    if (deadline !== undefined) win.clearTimeout(deadline);
    for (const id of timers) win.clearTimeout(id);
    first?.removeEventListener("load", onFrame);
    button.removeEventListener("click", onClick);
    root.removeEventListener("animationend", onEnd);
    doc.removeEventListener("keydown", onKey);
    doc.removeEventListener("visibilitychange", onVisibility);
    reduce.removeEventListener("change", onReduce);
    win.removeEventListener("load", onLoad);
  };
}
