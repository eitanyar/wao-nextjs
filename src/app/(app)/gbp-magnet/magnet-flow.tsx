'use client';

import { useRef, useState, type FormEvent } from 'react';
import { PAGE_COPY } from '@/lib/gbp-magnet-page-copy';

type Phase = 'preview' | 'preview_wait' | 'unlock' | 'unlock_wait' | 'full';
type ErrorKey = 'state.noMatch' | 'state.rateLimited' | 'state.unavailable' | 'state.validationError';
type Preview = {
  targetName: string;
  targetRating: number | null;
  targetReviewCount: number;
  competitorName: string | null;
  competitorRating: number | null;
  competitorReviewCount: number | null;
};
type Pace = { d30: number; d60: number; d90: number };
type Entry = { name: string; rating: number | null; reviewCount: number; recentPace: Pace; sampleSize: number };
type Full = { targetName: string; targetRating: number | null; targetReviewCount: number;
  targetRecentPace: Pace; targetSampleSize: number; competitors: Entry[] };
type ClickIds = { gclid?: string; wbraid?: string; gbraid?: string };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function rating(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}
function pace(value: unknown): value is Pace {
  return record(value) && count(value.d30) && count(value.d60) && count(value.d90);
}
function entry(value: unknown): value is Entry {
  return record(value) && typeof value.name === 'string' && !!value.name.trim() &&
    rating(value.rating) && count(value.reviewCount) && pace(value.recentPace) && count(value.sampleSize);
}
function previewReply(value: unknown): value is Preview & { previewToken: string; success: true } {
  return record(value) && value.success === true && typeof value.previewToken === 'string' && !!value.previewToken &&
    typeof value.targetName === 'string' && !!value.targetName.trim() && rating(value.targetRating) &&
    count(value.targetReviewCount) && (value.competitorName === null ||
      (typeof value.competitorName === 'string' && !!value.competitorName.trim())) &&
    rating(value.competitorRating) &&
    (value.competitorReviewCount === null || count(value.competitorReviewCount)) &&
    (value.competitorName !== null || (value.competitorRating === null && value.competitorReviewCount === null)) &&
    (value.competitorName === null || value.competitorReviewCount !== null);
}
function fullReply(value: unknown): value is Full & { success: true } {
  return record(value) && value.success === true && typeof value.targetName === 'string' &&
    !!value.targetName.trim() && rating(value.targetRating) && count(value.targetReviewCount) &&
    pace(value.targetRecentPace) && count(value.targetSampleSize) &&
    Array.isArray(value.competitors) && value.competitors.length <= 3 && value.competitors.every(entry);
}
function validField(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max;
}
function statusError(status: number, body: unknown): ErrorKey {
  if (status === 200 && record(body) && body.success === false && body.reason === 'no_match') return 'state.noMatch';
  if (status === 400) return 'state.validationError';
  if (status === 429) return 'state.rateLimited';
  return 'state.unavailable';
}

const fieldClass = 'w-full rounded-xl border bg-[var(--bg)] p-3 text-[var(--text)]';
const cardClass = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6';

function Signals({ name, ratingValue, reviewCount, paceValue, sampleSize }: {
  name: string; ratingValue: number | null; reviewCount: number; paceValue?: Pace; sampleSize?: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <h3 className="mb-3 font-bold break-words">{name}</h3>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="text-[var(--muted)]">{PAGE_COPY['report.ratingLabel']}</dt>
          <dd dir="ltr" className="text-right font-bold">{ratingValue === null ? '-' : String(ratingValue)}</dd></div>
        <div><dt className="text-[var(--muted)]">{PAGE_COPY['report.reviewCountLabel']}</dt>
          <dd dir="ltr" className="text-right font-bold">{String(reviewCount)}</dd></div>
      </dl>
      {paceValue && sampleSize !== undefined && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="font-semibold">{PAGE_COPY['report.paceLabel']}</p>
          <dl className="flex flex-wrap gap-x-5 gap-y-1" dir="ltr">
            {(['d30', 'd60', 'd90'] as const).map((period) => (
              <div key={period} className="flex gap-1"><dt>{period}:</dt><dd>{String(paceValue[period])}</dd></div>
            ))}
            <div className="flex gap-1"><dt>sample:</dt><dd>{String(sampleSize)}</dd></div>
          </dl>
          <p className="mt-2 text-sm text-[var(--muted)]">{PAGE_COPY['report.smallSampleDisclaimer']}</p>
        </div>
      )}
    </div>
  );
}

export default function MagnetFlow() {
  const [phase, setPhase] = useState<Phase>('preview');
  const [error, setError] = useState<ErrorKey | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [clickIds] = useState<ClickIds>(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const ids: ClickIds = {};
    for (const key of ['gclid', 'wbraid', 'gbraid'] as const) {
      const value = params.get(key);
      if (value !== null) ids[key] = value;
    }
    return ids;
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [full, setFull] = useState<Full | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const busy = useRef(false);

  function restart() {
    if (busy.current) return;
    setPreviewToken(null);
    setPreview(null);
    setFull(null);
    setError(null);
    setInvalid([]);
    setConsent(false);
    setPhase('preview');
  }

  async function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const bad = [
      !validField(businessName, 120) && 'businessName',
      !validField(city, 60) && 'city',
      !validField(category, 60) && 'category',
    ].filter((value): value is string => !!value);
    setInvalid(bad);
    if (bad.length) { setError('state.validationError'); return; }
    busy.current = true;
    setError(null);
    setPhase('preview_wait');
    try {
      const response = await fetch('/api/gbp-magnet/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim(), city: city.trim(), category: category.trim() }),
      });
      const body: unknown = await response.json();
      if (response.status === 200 && previewReply(body)) {
        setPreview({ targetName: body.targetName, targetRating: body.targetRating,
          targetReviewCount: body.targetReviewCount, competitorName: body.competitorName,
          competitorRating: body.competitorRating, competitorReviewCount: body.competitorReviewCount });
        setPreviewToken(body.previewToken);
        setPhase('unlock');
      } else {
        setError(statusError(response.status, body));
        if (response.status === 400) setInvalid(['businessName', 'city', 'category']);
        setPhase('preview');
      }
    } catch {
      setError('state.unavailable');
      setPhase('preview');
    } finally {
      busy.current = false;
    }
  }

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !previewToken || !consent) return;
    const normalizedPhone = phone.replace(/[\s-]/g, '');
    const bad = [
      !validField(name, 120) && 'name',
      !/^0\d{8,9}$/.test(normalizedPhone) && 'phone',
      (!validField(email, 320) || !email.trim().includes('@')) && 'email',
    ].filter((value): value is string => !!value);
    setInvalid(bad);
    if (bad.length) { setError('state.validationError'); return; }
    busy.current = true;
    setError(null);
    setPhase('unlock_wait');
    try {
      const response = await fetch('/api/gbp-magnet/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewToken, name: name.trim(), phone: normalizedPhone,
          email: email.trim(), consentGiven: true, ...clickIds }),
      });
      const body: unknown = await response.json();
      if (response.status === 200 && fullReply(body)) {
        setFull({ targetName: body.targetName, targetRating: body.targetRating,
          targetReviewCount: body.targetReviewCount, targetRecentPace: body.targetRecentPace,
          targetSampleSize: body.targetSampleSize, competitors: body.competitors });
        setPreviewToken(null);
        setPhase('full');
      } else {
        setError(statusError(response.status, body));
        if (response.status === 400) setInvalid(['name', 'phone', 'email']);
        if (response.status === 403 || (response.status === 200 && record(body) && body.reason === 'no_match')) {
          setPreviewToken(null);
          setPhase('preview');
        } else {
          setPhase('unlock');
        }
      }
    } catch {
      setError('state.unavailable');
      setPhase('unlock');
    } finally {
      busy.current = false;
    }
  }

  function fieldError(key: string) { return invalid.includes(key) ? 'border-red-500' : 'border-[var(--border)]'; }
  const isPreview = phase === 'preview' || phase === 'preview_wait';
  const isUnlock = phase === 'unlock' || phase === 'unlock_wait';

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-body), sans-serif' }}>
      <div aria-live="polite" className="space-y-6">
        {error && <p role="status" className="rounded-xl border border-red-500 p-4 text-[var(--text)]">{PAGE_COPY[error]}</p>}
        {isPreview && (
          <form onSubmit={submitPreview} noValidate className={`${cardClass} space-y-5`}>
            {([
              ['businessName', PAGE_COPY['form.businessNameLabel'], businessName, setBusinessName, 120],
              ['city', PAGE_COPY['form.cityLabel'], city, setCity, 60],
              ['category', PAGE_COPY['form.categoryLabel'], category, setCategory, 60],
            ] as const).map(([key, label, value, setter, max]) => (
              <label key={key} className="block space-y-2 font-semibold">
                <span>{label}</span>
                <input name={key} value={value} onChange={(event) => setter(event.target.value)}
                  maxLength={max} aria-invalid={invalid.includes(key)} disabled={phase === 'preview_wait'}
                  className={`${fieldClass} ${fieldError(key)}`} />
              </label>
            ))}
            <button type="submit" disabled={phase === 'preview_wait'} className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50">
              {PAGE_COPY['form.previewCta']}
            </button>
          </form>
        )}
        {isUnlock && preview && (
          <>
            <section className={`${cardClass} space-y-4`}>
              <h2 className="text-xl font-bold">{PAGE_COPY['report.previewHeading']}</h2>
              <div className="space-y-2"><h3 className="font-semibold">{PAGE_COPY['report.yourBusiness']}</h3>
                <Signals name={preview.targetName} ratingValue={preview.targetRating} reviewCount={preview.targetReviewCount} /></div>
              {preview.competitorName !== null && preview.competitorReviewCount !== null && (
                <Signals name={preview.competitorName} ratingValue={preview.competitorRating} reviewCount={preview.competitorReviewCount} />
              )}
              <p className="text-[var(--muted)]">{PAGE_COPY['page.previewTease']}</p>
            </section>
            <form onSubmit={submitUnlock} noValidate className={`${cardClass} space-y-5`}>
              {([
                ['name', PAGE_COPY['form.nameLabel'], name, setName, 'text'],
                ['phone', PAGE_COPY['form.phoneLabel'], phone, setPhone, 'tel'],
                ['email', PAGE_COPY['form.emailLabel'], email, setEmail, 'email'],
              ] as const).map(([key, label, value, setter, type]) => (
                <label key={key} className="block space-y-2 font-semibold">
                  <span>{label}</span>
                  <input name={key} type={type} value={value} onChange={(event) => setter(event.target.value)}
                    maxLength={key === 'email' ? 320 : 120} aria-invalid={invalid.includes(key)}
                    disabled={phase === 'unlock_wait'} className={`${fieldClass} ${fieldError(key)}`} />
                </label>
              ))}
              <label className="flex items-start gap-3">
                <input type="checkbox" name="consent" checked={consent} onChange={(event) => setConsent(event.target.checked)}
                  disabled={phase === 'unlock_wait'} className="mt-1 size-5 shrink-0 accent-[var(--accent)]" />
                <span>{PAGE_COPY['page.consentLine']}</span>
              </label>
              <p className="text-sm text-[var(--muted)]">{PAGE_COPY['page.privacyNote']}</p>
              <button type="submit" disabled={!consent || phase === 'unlock_wait'}
                className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50">
                {PAGE_COPY['page.unlockCta']}
              </button>
            </form>
          </>
        )}
        {phase === 'full' && full && (
          <section className={`${cardClass} space-y-5`}>
            <h2 className="text-xl font-bold">{PAGE_COPY['report.fullHeading']}</h2>
            <div className="space-y-2"><h3 className="font-semibold">{PAGE_COPY['report.yourBusiness']}</h3>
              <Signals name={full.targetName} ratingValue={full.targetRating} reviewCount={full.targetReviewCount}
                paceValue={full.targetRecentPace} sampleSize={full.targetSampleSize} /></div>
            <h3 className="text-lg font-bold">{PAGE_COPY['report.competitorsHeading']}</h3>
            {full.competitors.map((competitor, index) => (
              <Signals key={`${competitor.name}-${index}`} name={competitor.name} ratingValue={competitor.rating}
                reviewCount={competitor.reviewCount} paceValue={competitor.recentPace} sampleSize={competitor.sampleSize} />
            ))}
            <p className="font-semibold">{PAGE_COPY['page.nextStepGeneric']}</p>
          </section>
        )}
        {phase === 'preview' && preview !== null && (
          <button type="button" onClick={restart} className="btn-outline w-full sm:w-auto justify-center">
            {PAGE_COPY['form.previewCta']}
          </button>
        )}
      </div>
    </div>
  );
}
