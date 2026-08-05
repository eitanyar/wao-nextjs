/**
 * Deliberately inert — per visual-design spec §2.2. Plain text, no pill/border, not a
 * button/link, not in tab order, no hover state. Kept as its own tiny component so no
 * shared "pill"/button class change elsewhere on the site can accidentally make this look
 * clickable later.
 */
export default function QueueDepthNote({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <p className="text-xs text-[var(--muted)]" style={{ cursor: 'default' }}>
      {count === 1 ? 'עוד המלצה אחת ממתינה ללקוח זה' : `+${count} ממתינות ללקוח זה`}
    </p>
  );
}
