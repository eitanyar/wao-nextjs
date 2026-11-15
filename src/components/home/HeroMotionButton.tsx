"use client";
// Skip / replay control for the homepage hero motion (spec §1, §5), outside the aria-hidden scene. It also mounts the
// controller (src/lib/home/heroMotion.ts) on its parent wrapper. Hidden until the motion first starts, so no-JS and
// reduced-motion visitors keep the bare resting frame. HEBREW-SAFETY: zero Hebrew bytes (labels come as props).
import { useEffect, useRef } from "react";
import { startHeroMotion, type HeroMotionLabels } from "@/lib/home/heroMotion";
import styles from "./heroMotion.module.css";

export default function HeroMotionButton({ skip, replay }: HeroMotionLabels) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const root = ref.current?.parentElement;
    return root ? startHeroMotion(root, window, { skip, replay }) : undefined;
  }, [skip, replay]);
  return (
    <button ref={ref} type="button" className={styles.btn} data-hm-button="" aria-label={replay} hidden>
      <svg className={styles.icoSkip} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5l9 7-9 7zM19 5v14" />
      </svg>
      <svg className={styles.icoReplay} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
      </svg>
    </button>
  );
}
