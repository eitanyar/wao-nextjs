'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { ADVISOR_MARKETS, AdvisorPanelResult } from '@/lib/seo-advisor-panel';

type Market = (typeof ADVISOR_MARKETS)[number];
const control = 'mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400';

export function SeoAdvisorWorkspace({ markets }: { markets: readonly Market[] }) {
  const [domain, setDomain] = useState('');
  const [location, setLocation] = useState('default');
  const [language, setLanguage] = useState('default');
  const [cap, setCap] = useState(1000);
  const [result, setResult] = useState<AdvisorPanelResult | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const selected = markets.find(market => String(market.locationCode ?? 'default') === location) ?? markets[0];

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !domain.trim() || ![400, 1000, 2000].includes(cap)) return;
    inFlight.current = true;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/seo-advisor/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), locationCode: selected.locationCode, languageCode: language === 'default' ? null : language, approvedCap: cap }),
      });
      if (response.status === 401) { setResult({ status: 'unavailable', reason: 'Admin session expired. Sign in again.', actions: [], plannedTools: [] }); return; }
      const data = await response.json() as AdvisorPanelResult;
      setResult(data);
    } catch {
      setResult({ status: 'unavailable', reason: 'Request unavailable.', actions: [], plannedTools: [] });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main dir="ltr" lang="en" className="mx-auto max-w-5xl px-4 py-10 text-left sm:px-8">
      <header className="mb-8 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Internal operator tool</p>
        <h1 className="mt-2 text-3xl font-bold">SEO Advisor</h1>
        <p className="mt-3 text-sm text-slate-300">Run a bounded, evidence-based domain review. Advisory only; no client property changes.</p>
      </header>
      <form onSubmit={run} className="grid gap-5 rounded-2xl border border-white/15 bg-white/5 p-6 sm:grid-cols-2 sm:p-8">
        <label className="block text-sm font-semibold">Domain
          <input className={control} type="text" value={domain} onChange={event => setDomain(event.target.value)} placeholder="ajudaica.com" required autoComplete="off" />
        </label>
        <label className="block text-sm font-semibold">Location
          <select className={control} value={location} onChange={event => { setLocation(event.target.value); setLanguage('default'); }}>
            {markets.map(market => <option key={market.locationLabel} value={market.locationCode ?? 'default'}>{market.locationLabel}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Language
          <select className={control} value={language} disabled={selected.locationCode === null} onChange={event => setLanguage(event.target.value)}>
            {selected.locationCode !== null && <option value="default" title="Location default (no language override)">Default (location)</option>}
            {selected.languages.map(option => <option key={option.label} value={option.code ?? 'default'}>{option.label}</option>)}
          </select>
          <span className="mt-2 block text-xs font-normal text-slate-400">Choose a location for its default language, or select an explicit language. Project default sends no market override.</span>
        </label>
        <label className="block text-sm font-semibold">Credit cap
          <select className={control} value={cap} onChange={event => setCap(Number(event.target.value))}>
            {[400, 1000, 2000].map(value => <option key={value} value={value}>{value} credits</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <p className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">Metered: up to {cap} OpenSEO credits (real DataForSEO pay-as-you-go). One run per click.</p>
          <button type="submit" disabled={busy || !domain.trim()} className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Running…' : 'Run advisor'}</button>
        </div>
      </form>
      {result && <section aria-live="polite" className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4"><h2 className="text-xl font-bold">Results</h2><span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-bold uppercase text-cyan-200">{result.status.replaceAll('_', ' ')}</span></div>
        {result.reason && <p className="mt-3 text-amber-200">{result.reason}</p>}
        <p className="mt-3 text-sm text-slate-300">Observed credits: {result.observedCredits ?? 0} · Planned tools: {result.plannedTools.length}</p>
        <ol className="mt-5 space-y-4">{result.actions.map(item => <li key={item.rank} className="min-w-0 rounded-xl border border-white/10 p-4"><h3 className="font-semibold">{item.rank}. {item.action}</h3><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-3 text-xs text-slate-300">{JSON.stringify(item.evidence, null, 2)}</pre></li>)}</ol>
      </section>}
    </main>
  );
}
