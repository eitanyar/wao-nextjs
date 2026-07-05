import type { ReactNode } from 'react';

/** <ol> wrapper for the three manual-path steps. Each child renders its own <li>. */
export default function InstructionSteps({ children }: { children: ReactNode }) {
  return <ol className="mb-8 list-none space-y-6">{children}</ol>;
}
