"use client";
// Skip / replay control for the homepage hero motion (spec §1, §5), and pause / play in showcase-loop mode, outside
// the aria-hidden scene. It also mounts the controller (src/lib/home/heroMotion.ts) on its parent wrapper. Hidden
// until the motion first starts, so no-JS and reduced-motion visitors keep the bare resting frame.
// Class names come as props from the server component, so the CSS-module map stays out of the client bundle.
// HEBREW-SAFETY: zero Hebrew bytes (labels come as props).
import { useEffect, useRef } from "react";
import { startHeroMotion, type HeroMotionLabels } from "@/lib/home/heroMotion";
import { fitHeroStage } from "@/lib/home/heroStageFit";

export interface HeroMotionButtonProps {
  labels: HeroMotionLabels;
  /** [button, skip icon, replay icon, pause icon, play icon] */
  classes: [string, string, string, string, string];
}

export default function HeroMotionButton({ labels, classes }: HeroMotionButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { skip, replay, pause, play } = labels;
  // Explicit stage scale for every visitor (incl. reduced motion): WebKit miscomputes the CSS atan2 fit.
  useEffect(() => {
    const scene = ref.current?.parentElement?.querySelector<HTMLElement>("[data-hm-scene]");
    return scene ? fitHeroStage(scene, window) : undefined;
  }, []);
  useEffect(() => {
    const root = ref.current?.parentElement;
    return root ? startHeroMotion(root, window, { skip, replay, pause, play }) : undefined;
  }, [skip, replay, pause, play]);
  const [btn, icoSkip, icoReplay, icoPause, icoPlay] = classes;
  return (
    <button ref={ref} type="button" className={btn} data-hm-button="" aria-label={replay} hidden>
      <svg className={icoSkip} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5l9 7-9 7zM19 5v14" />
      </svg>
      <svg className={icoReplay} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
      </svg>
      {pause && play ? (
        <>
          <svg className={icoPause} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14M16 5v14" />
          </svg>
          <svg className={icoPlay} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5l12 7-12 7z" />
          </svg>
        </>
      ) : null}
    </button>
  );
}
