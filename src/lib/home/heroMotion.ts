// Homepage hero motion controller (docs/specs/hero-motion-spec-maya-2026-11-15.md §1). The animation itself is CSS
// keyframes (src/components/home/heroMotion.module.css, generated); this only flips data-motion="rest|playing" on
// the scene wrapper. No per-frame JS. HEBREW-SAFETY: this module contains ZERO Hebrew bytes (labels are passed in).
//
// Start = window load + idle (requestIdleCallback, 1200 ms fallback) AND >= 60% of the scene in view AND the window's
// iframe has loaded. If the iframe has not loaded 3 s after the other two hold, it never plays (the resting frame
// stays). Ends on the pointer's animationend, Esc or the skip button. Reduced motion: never plays, button hidden.

export type HeroMotionState = "rest" | "playing";

export interface HeroMotionLabels {
  skip: string;
  replay: string;
}

export const HERO_MOTION_IFRAME_DEADLINE_MS = 3000;
export const HERO_MOTION_IDLE_FALLBACK_MS = 1200;
export const HERO_MOTION_IN_VIEW = 0.6;

/** The DOM the controller expects inside the wrapper (selectors shared with HeroScene.tsx). */
export const HERO_MOTION_SELECTORS = { button: "[data-hm-button]", scene: "[data-hm-scene]", frame: "iframe", pointer: "[data-hm-pointer]" } as const;

type Listener = (event: { key?: string; target?: unknown; matches?: boolean }) => void;
interface Target { addEventListener(type: string, fn: Listener, opts?: unknown): void; removeEventListener(type: string, fn: Listener): void }
interface El extends Target { setAttribute(n: string, v: string): void; getAttribute(n: string): string | null; removeAttribute(n: string): void }
interface Root extends El { readonly offsetWidth: number; querySelector(sel: string): unknown }
interface Button extends El { hidden: boolean }
interface Frame extends Target { readonly contentDocument?: { readyState: string; URL: string } | null }
interface Win extends Target {
  document: Target & { readyState: string };
  matchMedia(q: string): Target & { matches: boolean };
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
  IntersectionObserver?: new (cb: (entries: { intersectionRatio: number }[]) => void, opts: { threshold: number[] }) => { observe(el: unknown): void; disconnect(): void };
}

/** True once the iframe holds its real document (a lazy iframe not yet loaded reports about:blank). */
function frameLoaded(frame: Frame): boolean {
  try {
    const doc = frame.contentDocument;
    return !!doc && doc.readyState === "complete" && doc.URL !== "about:blank";
  } catch {
    return false;
  }
}

/** Wires the controller to a rendered wrapper; returns a disposer. */
export function startHeroMotion(root: Root, win: Win, labels: HeroMotionLabels): () => void {
  const button = root.querySelector(HERO_MOTION_SELECTORS.button) as Button | null;
  const frame = root.querySelector(HERO_MOTION_SELECTORS.frame) as Frame | null;
  const pointer = root.querySelector(HERO_MOTION_SELECTORS.pointer) as Target | null;
  const scene = root.querySelector(HERO_MOTION_SELECTORS.scene);
  if (!button || !frame || !pointer || !scene) return () => {};
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  let idle = false, seen = false, loaded = frameLoaded(frame), expired = false, started = false;
  let deadline: number | undefined;
  let io: { disconnect(): void } | undefined;

  const set = (state: HeroMotionState) => {
    root.setAttribute("data-motion", state);
    button.setAttribute("aria-label", state === "playing" ? labels.skip : labels.replay);
  };
  const play = () => {
    if (reduce.matches) return;
    root.removeAttribute("data-motion");
    void root.offsetWidth; // reflow, so re-adding the attribute restarts every keyframe from 0
    set("playing");
    button.hidden = false;
  };
  const rest = () => {
    if (root.getAttribute("data-motion") === "playing") set("rest");
  };
  const check = () => {
    if (started || expired || reduce.matches || !idle || !seen) return;
    if (loaded) {
      started = true;
      if (deadline !== undefined) win.clearTimeout(deadline);
      io?.disconnect();
      play();
    } else if (deadline === undefined) {
      deadline = win.setTimeout(() => { expired = !loaded; check(); }, HERO_MOTION_IFRAME_DEADLINE_MS);
    }
  };

  const onFrame: Listener = () => { if (!expired) { loaded = true; check(); } };
  const onIdle = () => { idle = true; check(); };
  const onLoad: Listener = () => {
    if (win.requestIdleCallback) win.requestIdleCallback(onIdle, { timeout: HERO_MOTION_IDLE_FALLBACK_MS });
    else win.setTimeout(onIdle, HERO_MOTION_IDLE_FALLBACK_MS);
  };
  const onKey: Listener = (e) => { if (e.key === "Escape") rest(); };
  const onClick: Listener = () => { if (root.getAttribute("data-motion") === "playing") rest(); else play(); };
  const onEnd: Listener = (e) => { if (e.target === pointer) rest(); };
  const onReduce: Listener = () => {
    if (reduce.matches) { rest(); button.hidden = true; }
    else if (started) button.hidden = false;
    else check();
  };

  frame.addEventListener("load", onFrame);
  button.addEventListener("click", onClick);
  pointer.addEventListener("animationend", onEnd);
  win.document.addEventListener("keydown", onKey);
  reduce.addEventListener("change", onReduce);
  if (win.IntersectionObserver) {
    const observer = new win.IntersectionObserver((entries) => {
      seen = entries.some((e) => e.intersectionRatio >= HERO_MOTION_IN_VIEW);
      check();
    }, { threshold: [HERO_MOTION_IN_VIEW] });
    observer.observe(scene);
    io = observer;
  } else seen = true;
  if (win.document.readyState === "complete") onLoad({});
  else win.addEventListener("load", onLoad);

  return () => {
    io?.disconnect();
    if (deadline !== undefined) win.clearTimeout(deadline);
    frame.removeEventListener("load", onFrame);
    button.removeEventListener("click", onClick);
    pointer.removeEventListener("animationend", onEnd);
    win.document.removeEventListener("keydown", onKey);
    reduce.removeEventListener("change", onReduce);
    win.removeEventListener("load", onLoad);
  };
}
