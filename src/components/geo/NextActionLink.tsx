/** Shown when the client's whole action list is done — celebration + "next batch" framing. */
export default function NextActionLink() {
  return (
    <div className="mt-10 text-center">
      <p className="mb-1 text-lg font-semibold text-[var(--text)]">לא כולם מגיעים לפה. הרשימה ריקה.</p>
      <p className="text-sm text-[var(--muted)]">המנה הבאה בדרך. נודיע לך בוואטסאפ כשהיא מוכנה. ←</p>
    </div>
  );
}
