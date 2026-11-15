// Homepage hero visual (docs/missions/homepage-hero-motion-2026-11-15.md, step 2: resting state, no motion).
// An AI-made photo of a laptop on a plumber's workbench, with a live "browser window" laid onto its screen:
// the product's own Google ad preview above the product-rendered landing page it points to, and a chat chip
// standing for the intake chat. Server-rendered and static; no client JS.
//
// a11y: the whole scene is aria-hidden + inert. It illustrates the hero's promise, and the hero CTA next to it
// carries the action; a screen reader would otherwise read a second business's page (its own h1, nav, phone)
// inside WAO's homepage. A role="img" description would need a new Hebrew string (listed as NEEDED for step 3).
//
// Geometry: the stage is the photo's own pixel grid (HERO_SCENE.width x height), scaled to the box with
// scale: tan(atan2(100cqw, var(--scene-w))) (a unitless ratio of two lengths, no JS). The window is a 960x605 virtual
// screen mapped onto the fitted screen corners by one matrix3d. Browsers without trig / container units skip the
// stage and show the photo with its screen switched off (the build step paints it near-black).
import GoogleAdPreview from "@/components/google-ads/GoogleAdPreview";
import { HERO_SCENE } from "@/data/heroScene";
import {
  HERO_AD,
  HERO_LP_PATH,
  HERO_TAB_TITLE,
  HERO_WINDOW_LP_HEIGHT,
  HERO_WINDOW_SERP,
  HERO_WINDOW_SIZE,
  HERO_WINDOW_TAB_BAR,
  heroWindowTransform,
} from "@/lib/home/heroWindow";

const pct = (v: number) => `${+((v / HERO_SCENE.height) * 100).toFixed(4)}%`;

/** Rendered width of the scene, for the image srcset: half the 1112px container above 1024px, else the container. */
const SCENE_SIZES = "(min-width: 1024px) 560px, (max-width: 480px) calc(100vw - 96px), calc(100vw - 48px)";

export default function HeroScene() {
  return (
    <div
      className="hero-scene"
      aria-hidden="true"
      inert
      style={{ aspectRatio: `${HERO_SCENE.width} / ${HERO_SCENE.height}`, ["--scene-w" as string]: `${HERO_SCENE.width}px` }}
    >
      {HERO_SCENE.tiles.map((tile) => (
        <picture key={tile.id} className="hero-scene-tile" style={{ top: pct(tile.top), height: pct(tile.height) }}>
          <source type="image/avif" srcSet={tile.avif} sizes={SCENE_SIZES} />
          <img
            src={tile.fallback}
            srcSet={tile.webp}
            sizes={SCENE_SIZES}
            width={tile.fallbackWidth}
            height={tile.fallbackHeight}
            alt=""
            decoding="async"
            fetchPriority="low"
            loading="lazy"
          />
        </picture>
      ))}
      <div className="hero-stage" style={{ width: HERO_SCENE.width, height: HERO_SCENE.height }}>
        <div
          className="hero-window"
          style={{ width: HERO_WINDOW_SIZE.width, height: HERO_WINDOW_SIZE.height, transform: heroWindowTransform() }}
        >
          <div className="hero-window-tabs" style={{ height: HERO_WINDOW_TAB_BAR }}>
            <span className="hero-window-tab">
              <span className="hero-window-favicon" />
              <span className="hero-window-tab-title">{HERO_TAB_TITLE}</span>
            </span>
          </div>
          <div className="hero-window-serp" style={{ height: HERO_WINDOW_SERP }}>
            <GoogleAdPreview displayUrl={HERO_AD.displayUrl} headlines={HERO_AD.headlines} descriptions={HERO_AD.descriptions} />
          </div>
          <iframe
            className="hero-window-lp"
            src={HERO_LP_PATH}
            title={HERO_TAB_TITLE}
            width={HERO_WINDOW_SIZE.width}
            height={HERO_WINDOW_LP_HEIGHT}
            loading="lazy"
            tabIndex={-1}
          />
          <span className="hero-window-chat">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
