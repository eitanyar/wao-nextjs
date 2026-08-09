export interface ReflectionPayload {
  tags: { program: 'fear' | 'victimhood' | 'comparison' | 'bypass-lie' | 'empowered'; quoteHe: string; note?: string }[];
  evidenceActions: { action: string; quoteHe: string }[];
  ratio: { empoweredRatio: number | null; counts: Record<string, number> };
}

const PROGRAM_LABEL: Record<string, string> = {
  fear: 'פחד',
  victimhood: 'קורבנות',
  comparison: 'השוואה',
  'bypass-lie': 'תירוץ',
  empowered: 'מעצים',
};

/** The Language Mirror's per-session output — every tag quotes exact Hebrew (no scores). */
export default function ReflectionCard({
  reflection,
  ledgerUpdated,
  beliefStatus,
}: {
  reflection: ReflectionPayload;
  ledgerUpdated?: boolean;
  beliefStatus?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <h2 className="font-bold text-lg">מראה השפה</h2>

      {reflection.ratio.empoweredRatio !== null && (
        <p className="text-sm text-[var(--muted)]">
          יחס מעצים בשיחה הזו: {Math.round(reflection.ratio.empoweredRatio * 100)}%
        </p>
      )}

      {reflection.tags.length > 0 && (
        <div className="space-y-2">
          {reflection.tags.map((t, i) => (
            <div key={i} className="text-sm border-r-2 border-white/20 pr-3">
              <span className="text-xs text-[var(--muted)]">{PROGRAM_LABEL[t.program] ?? t.program}</span>
              <p dir="rtl">״{t.quoteHe}״</p>
            </div>
          ))}
        </div>
      )}

      {reflection.evidenceActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">עדות שנרשמה</h3>
          {reflection.evidenceActions.map((e, i) => (
            <p key={i} className="text-sm text-[var(--muted)]" dir="rtl">
              ״{e.quoteHe}״
            </p>
          ))}
        </div>
      )}

      {ledgerUpdated && beliefStatus === 'retired' && (
        <p className="text-sm font-semibold">האמונה הזו פרשה — מספיק עדות נרשמה.</p>
      )}
      {ledgerUpdated && beliefStatus === 'retiring' && (
        <p className="text-sm text-amber-400">תבנית ישנה חזרה — האמונה חוזרת למעקב.</p>
      )}
    </div>
  );
}
