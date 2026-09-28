"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import copy from "@/content/astra-homepage-copy.json";

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="astra-header">
      <div className="wao-container">
        <div className="wao-header-inner astra-header-inner">
          <Link href="/" aria-label="WAO" className="astra-logo">
            WAO
          </Link>

          <nav aria-label="Primary" className="astra-header-nav hidden md:flex">
            {copy.navigation.links.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="astra-header-actions">
            <Link href={copy.navigation.help_link.href} className="astra-help-link hidden lg:inline-flex">
              {copy.navigation.help_link.label}
            </Link>
            <Link
              href={copy.navigation.primary_cta.href}
              className="astra-header-cta wao-cta-desktop-only"
            >
              {copy.navigation.primary_cta.label}
            </Link>
            <button
              type="button"
              className="astra-menu-button md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
            >
              <span className={open ? "astra-menu-line astra-menu-line-open-one" : "astra-menu-line"} />
              <span className={open ? "astra-menu-line astra-menu-line-open-two" : "astra-menu-line"} />
              <span className={open ? "astra-menu-line astra-menu-line-open-three" : "astra-menu-line"} />
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav-menu"
          aria-label="Mobile"
          className="astra-mobile-menu md:hidden"
          hidden={!open}
        >
          {copy.navigation.links.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href={copy.navigation.help_link.href} onClick={() => setOpen(false)}>
            {copy.navigation.help_link.label}
          </Link>
          <Link
            href={copy.navigation.primary_cta.href}
            onClick={() => setOpen(false)}
            className="astra-header-cta"
          >
            {copy.navigation.primary_cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
