import { renderMixed } from '@/lib/bidi';

interface Props {
  title: string;
  url?:  string;
}

export default function ActionHeader({ title, url }: Props) {
  return (
    <header className="mb-6">
      <h1 className="mb-1 text-2xl font-bold">{renderMixed(title)}</h1>
      {url && (
        <p className="text-sm text-[var(--muted)]">
          <bdi dir="ltr" className="font-mono">{url}</bdi>
        </p>
      )}
    </header>
  );
}
