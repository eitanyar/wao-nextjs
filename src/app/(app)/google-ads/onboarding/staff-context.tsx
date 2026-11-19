"use client";

import { createContext, useContext, type ReactNode } from "react";

// Staff signal for the onboarding page. The layout (a Server Component) verifies the existing
// wao-admin cookie (src/lib/admin-auth.ts) and passes the boolean down; public visitors get false,
// so internal mode labels and sandbox controls are never rendered for them.
const OnboardingStaffContext = createContext(false);

export function OnboardingStaffProvider({ isStaff, children }: { isStaff: boolean; children: ReactNode }) {
  return <OnboardingStaffContext.Provider value={isStaff}>{children}</OnboardingStaffContext.Provider>;
}

export function useOnboardingStaff(): boolean {
  return useContext(OnboardingStaffContext);
}
