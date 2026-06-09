"use client";

import { useState, useRef, useId } from "react";
import Link from "next/link";
import { GLOSSARY } from "@/data/glossary";

export default function GlossaryTerm({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [nudge, setNudge] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const entry = GLOSSARY[term];

  if (!entry) return <>{children}</>;

  const adjustPosition = () => {
    requestAnimationFrame(() => {
      if (!tooltipRef.current) return;
      const rect = tooltipRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const GAP = 12;
      if (rect.right > vw - GAP) {
        setNudge(vw - GAP - rect.right); // negative → shift left
      } else if (rect.left < GAP) {
        setNudge(GAP - rect.left); // positive → shift right
      }
    });
  };

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setNudge(0);
    setVisible(true);
    adjustPosition();
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setVisible(false), 120);
  };

  const toggleMobile = () => (visible ? setVisible(false) : show());

  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span
        role="button"
        tabIndex={0}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={toggleMobile}
        onKeyDown={(e) => e.key === "Enter" && toggleMobile()}
        style={{
          borderBottom: "1px dashed rgba(74,227,181,0.7)",
          cursor: "help",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        {children}
      </span>

      <span
        id={id}
        ref={tooltipRef}
        role="tooltip"
        aria-hidden={!visible}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{
          position: "absolute",
          bottom: "calc(100% + 10px)",
          left: `calc(50% + ${nudge}px)`,
          transform: "translateX(-50%)",
          width: "272px",
          background: "rgba(10,14,18,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(74,227,181,0.22)",
          borderRadius: "10px",
          padding: "13px 16px 14px",
          zIndex: 9999,
          pointerEvents: entry.knowledgeSlug ? "auto" : "none",
          direction: "rtl",
          textAlign: "right",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,227,181,0.06)",
          opacity: visible ? 1 : 0,
          visibility: visible ? "visible" : "hidden",
          transition: "opacity 0.13s ease, visibility 0.13s ease",
        }}
      >
        {/* Arrow counter-adjusted to keep pointing at the term */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-6px",
            left: `calc(50% - ${nudge}px)`,
            marginLeft: "-6px",
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid rgba(10,14,18,0.97)",
          }}
        />

        <span
          style={{
            display: "block",
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 700,
            fontSize: "0.78rem",
            color: "var(--accent)",
            marginBottom: "5px",
            lineHeight: 1.3,
          }}
        >
          {entry.short}
        </span>

        <span
          style={{
            display: "block",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.68)",
            lineHeight: 1.65,
          }}
        >
          {entry.body}
        </span>

        {entry.knowledgeSlug && (
          <Link
            href={`/knowledge/${entry.knowledgeSlug}`}
            style={{
              display: "inline-block",
              marginTop: "8px",
              fontSize: "0.72rem",
              color: "var(--accent)",
              textDecoration: "none",
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 600,
              pointerEvents: "auto",
            }}
          >
            קרא עוד ←
          </Link>
        )}
      </span>
    </span>
  );
}
