// Fits the hero stage (the photo's pixel grid) to the scene box with an explicit scale, set from JS.
// The CSS rule `scale: tan(atan2(100cqw, var(--scene-w)))` is the no-JS first paint, but WebKit (every iOS browser,
// incl. Chrome on iPhone; Safari) resolves relative units inside atan2() wrongly (382px box -> scale 3.89, not 0.37),
// so the window is blown up off the laptop screen and the screen reads black. The inline scale written here overrides
// the class rule in every engine.
// HEBREW-SAFETY: zero Hebrew bytes.

interface Stage { style: { scale: string } }
interface Scene {
  readonly clientWidth: number;
  querySelector(sel: string): unknown;
  setAttribute(n: string, v: string): void;
  getAttribute(n: string): string | null;
  readonly style: { getPropertyValue(n: string): string };
}
interface ResizeObserverCtor { new (cb: () => void): { observe(el: unknown): void; disconnect(): void } }
interface Win {
  ResizeObserver?: ResizeObserverCtor;
  addEventListener(t: string, fn: () => void): void;
  removeEventListener(t: string, fn: () => void): void;
}

/**
 * The same fit as a parse-time inline script (rendered as the scene's last child by HeroScene.tsx), so WebKit never
 * paints the blown-up stage before hydration. Plain ES5, no Hebrew, no user data.
 */
export const HERO_STAGE_FIT_INLINE =
  "(function(s){if(!s)return;var w=parseFloat(s.style.getPropertyValue('--scene-w')),t=s.querySelector('.hero-stage');" +
  "if(t&&w>0&&s.clientWidth>0){t.style.scale=String(+(s.clientWidth/w).toFixed(6));s.setAttribute('data-hm-fit','')}})" +
  "(document.currentScript&&document.currentScript.parentElement)";

/** Stage scale for a scene box of `boxWidth` px over a photo `sceneWidth` px wide (0 when either is unknown). */
export function heroStageScale(boxWidth: number, sceneWidth: number): number {
  return boxWidth > 0 && sceneWidth > 0 ? +(boxWidth / sceneWidth).toFixed(6) : 0;
}

/** Keeps the stage fitted to the scene; returns a disposer. */
export function fitHeroStage(scene: Scene, win: Win): () => void {
  const stage = scene.querySelector(".hero-stage") as Stage | null;
  const sceneWidth = parseFloat(scene.style.getPropertyValue("--scene-w"));
  if (!stage || !(sceneWidth > 0)) return () => {};
  const apply = () => {
    const k = heroStageScale(scene.clientWidth, sceneWidth);
    if (!k) return;
    stage.style.scale = String(k);
    if (scene.getAttribute("data-hm-fit") === null) scene.setAttribute("data-hm-fit", "");
  };
  apply();
  if (win.ResizeObserver) {
    const ro = new win.ResizeObserver(apply);
    ro.observe(scene);
    return () => ro.disconnect();
  }
  win.addEventListener("resize", apply);
  return () => win.removeEventListener("resize", apply);
}
