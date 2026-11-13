import type { Metadata } from "next";
import type { ReactNode } from "react";

// The onboarding page is a client component, so its metadata lives here. It is a demo tool
// flow and must not compete with /google-ads in search: noindex, follow (Yonatan 2026-11-13).
// Title from docs/copy/copy-polish-approved-2026-11-13-batch2.json (anchor onboarding_title);
// the root template appends the RLM-anchored brand.
export const metadata: Metadata = {
  title: "דמו חינם: תוכנית Google Ads לעסק לדוגמה",
  robots: { index: false, follow: true },
};

export default function GoogleAdsOnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
