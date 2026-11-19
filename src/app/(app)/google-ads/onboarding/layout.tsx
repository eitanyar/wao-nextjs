import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { OnboardingStaffProvider } from "./staff-context";

// The onboarding page is a client component, so its metadata lives here. It is a demo tool
// flow and must not compete with /google-ads in search: noindex, follow (Yonatan 2026-11-13).
// Title from docs/copy/copy-polish-approved-2026-11-13-batch2.json (anchor onboarding_title);
// the root template appends the RLM-anchored brand.
export const metadata: Metadata = {
  title: "תוכנית Google Ads לעסק שלך, חינם",
  robots: { index: false, follow: true },
};

// Internal mode labels and sandbox controls render only for staff (the existing wao-admin cookie,
// same check as /trainer). Reading the cookie makes this route dynamic, which is intended.
export default async function GoogleAdsOnboardingLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const isStaff = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? "");
  return <OnboardingStaffProvider isStaff={isStaff}>{children}</OnboardingStaffProvider>;
}
