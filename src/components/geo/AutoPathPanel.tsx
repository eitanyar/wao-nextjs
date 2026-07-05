/** Path A (auto-publish) — calm confirmation, no steps required from the client. */
export default function AutoPathPanel() {
  return (
    <div className="mb-8 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">הכל אצלנו. אין מה לעשות.</h2>
      <p className="text-sm text-[var(--muted)]">
        נפרסם את השינוי עבורך. תוך 48 שעות תקבל אישור בוואטסאפ.
      </p>
      <a href="#publish-mode" className="mt-3 inline-block text-xs text-[var(--accent)] underline underline-offset-2">
        רוצה לפרסם בעצמך? שנה למעלה ↑
      </a>
    </div>
  );
}
