'use client';

interface Props {
  waLink:      string;
  label:       string;
  disabled?:   boolean;
}

export default function SendButton({ waLink, label, disabled }: Props) {
  return (
    <a
      href={disabled ? undefined : waLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed bg-[var(--muted)] text-[var(--bg)] opacity-50'
          : 'bg-[#25D366] text-white hover:bg-[#1ebe5d] cursor-pointer',
      ].join(' ')}
    >
      <span>📲</span>
      <span>{label}</span>
    </a>
  );
}
