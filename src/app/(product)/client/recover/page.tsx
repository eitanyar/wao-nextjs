import accessCopy from '@/data/client-access-copy.he.json';
import { RecoveryBackLink, RecoveryForm } from './recovery-form';

export const metadata = { robots: { index: false }, title: 'WAO Client Access Support' };

export default function ClientRecoveryPage() {
  const copy = accessCopy.recovery;
  const change = accessCopy.change;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" lang="he">
      <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <div className="mb-6 text-center"><span className="text-3xl font-black" dir="ltr">WAO</span></div>
        <h1 className="mb-2 text-xl font-bold">{copy.title}</h1>
        <RecoveryForm copy={{ title: copy.title, backToLogin: copy.backToLogin, codeLabel: change.currentPinLabel, newPinLabel: change.newPinLabel, confirmPinLabel: change.confirmPinLabel, policyHint: change.policyHint, mismatch: change.mismatch, policyFailure: change.policyFailure, genericFailure: change.genericFailure, submit: change.submit }} />
        <RecoveryBackLink copy={copy} />
      </section>
    </main>
  );
}
