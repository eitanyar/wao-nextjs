"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type proofCopy from "@/content/astra-real-proof-eeat-copy.json";

type Labels = typeof proofCopy.accessibility.basic_toolbar;
type Preference = "textLarge" | "highContrast" | "underlineLinks";
type Preferences = Record<Preference, boolean>;
const STORAGE_KEY = "wao-basic-accessibility-preferences-v1";
const CLASSES: Record<Preference, string> = {
  textLarge: "wao-a11y-text-large",
  highContrast: "wao-a11y-high-contrast",
  underlineLinks: "wao-a11y-underline-links",
};
const EMPTY: Preferences = { textLarge: false, highContrast: false, underlineLinks: false };

export default function AccessibilityControl({ labels }: { labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(EMPTY);
  const [bannerHeight, setBannerHeight] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          setPreferences({
            textLarge: stored.textLarge === true,
            highContrast: stored.highContrast === true,
            underlineLinks: stored.underlineLinks === true,
          });
        }
      } catch { /* Invalid local settings do not block the page. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    for (const key of Object.keys(CLASSES) as Preference[]) {
      document.documentElement.classList.toggle(CLASSES[key], preferences[key]);
    }
    return () => {
      for (const name of Object.values(CLASSES)) document.documentElement.classList.remove(name);
    };
  }, [preferences]);

  useEffect(() => {
    let resize: ResizeObserver | undefined;
    const watch = () => {
      resize?.disconnect();
      const banner = document.querySelector<HTMLElement>(".wao-cookie-banner");
      setBannerHeight(banner?.getBoundingClientRect().height ?? 0);
      if (banner) {
        resize = new ResizeObserver(() => setBannerHeight(banner.getBoundingClientRect().height));
        resize.observe(banner);
      }
    };
    watch();
    const observer = new MutationObserver(() => {
      const banner = document.querySelector(".wao-cookie-banner");
      if (Boolean(banner) !== Boolean(resize)) watch();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); resize?.disconnect(); };
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => { if (open) panel.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [open]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const update = (key: Preference) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const reset = () => {
    setPreferences(EMPTY);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="wao-a11y-control" style={{ bottom: `calc(${bannerHeight}px + ${bannerHeight ? 80 : 16}px)` }} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); close(); } }}>
      {open && (
        <div id="wao-a11y-panel" className="wao-a11y-panel" dir="rtl" ref={panel}>
          <button type="button" className="wao-a11y-close" onClick={close} aria-label={labels.close_panel_label}>{labels.close_panel_label}</button>
          {([
            ["textLarge", labels.increase_text_label],
            ["highContrast", labels.high_contrast_label],
            ["underlineLinks", labels.underline_links_label],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" className="wao-a11y-option" aria-pressed={preferences[key]} onClick={() => update(key)}>{label}</button>
          ))}
          <button type="button" className="wao-a11y-option" onClick={reset}>{labels.reset_label}</button>
          <Link href={labels.honest_link.href} className="wao-a11y-statement">{labels.honest_link.label}</Link>
        </div>
      )}
      <button ref={trigger} type="button" className="wao-a11y-trigger" aria-label={open ? labels.close_panel_label : labels.open_panel_label} title={labels.floating_control_label} aria-controls="wao-a11y-panel" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}>
        <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="5" r="2.5" /><path d="M15 10v9h8l3 7M15 13h7M12 14a10 10 0 1 0 12 12" />
        </svg>
      </button>
    </div>
  );
}
