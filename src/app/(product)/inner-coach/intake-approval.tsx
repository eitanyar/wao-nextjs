'use client';

import { useState } from 'react';

interface DraftBelief {
  limiting: string;
  program: 'fear' | 'victimhood' | 'comparison';
  origin?: string;
  empowering: string;
}

const PROGRAM_LABEL: Record<DraftBelief['program'], string> = {
  fear: 'פחד',
  victimhood: 'קורבנות',
  comparison: 'השוואה',
};

/**
 * The hand-approve step (vision §4): the extracted draft is never auto-written
 * to the ledger. Eitan reviews/edits each belief here, then approves — only
 * then does POST /api/inner-coach/ledger persist it.
 */
export default function IntakeApproval({ draftBeliefs }: { draftBeliefs: DraftBelief[] }) {
  const [beliefs, setBeliefs] = useState(draftBeliefs);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const update = (i: number, field: keyof DraftBelief, value: string) => {
    setBeliefs(prev => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  };

  const approve = async () => {
    setStatus('saving');
    try {
      const res = await fetch('/api/inner-coach/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beliefs }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'saved') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm">היומן נשמר. {beliefs.length} אמונות נוספו.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
      <div>
        <h2 className="font-bold text-lg mb-1">טיוטת יומן האמונות</h2>
        <p className="text-xs text-[var(--muted)]">ערוך כרצונך לפני שאתה מאשר — שום דבר לא נשמר בלי אישורך.</p>
      </div>

      {beliefs.map((b, i) => (
        <div key={i} className="rounded-xl border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">{PROGRAM_LABEL[b.program]}</span>
          </div>
          <label className="block text-xs text-[var(--muted)]">האמונה הישנה</label>
          <textarea
            className="w-full rounded-lg bg-black/20 border border-white/10 p-2 text-sm text-right"
            dir="rtl"
            rows={2}
            value={b.limiting}
            onChange={e => update(i, 'limiting', e.target.value)}
          />
          <label className="block text-xs text-[var(--muted)]">המשפט החדש</label>
          <textarea
            className="w-full rounded-lg bg-black/20 border border-white/10 p-2 text-sm text-right"
            dir="rtl"
            rows={2}
            value={b.empowering}
            onChange={e => update(i, 'empowering', e.target.value)}
          />
        </div>
      ))}

      <button
        onClick={approve}
        disabled={status === 'saving'}
        className="w-full rounded-lg bg-[var(--accent)] text-white font-semibold py-2.5 px-6 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'saving' ? 'שומר…' : 'אשר ושמור'}
      </button>
      {status === 'error' && <p className="text-red-400 text-sm text-center">שמירה נכשלה — נסה שוב.</p>}
    </div>
  );
}
