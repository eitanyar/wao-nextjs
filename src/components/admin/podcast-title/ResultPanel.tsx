'use client';
import { useState } from 'react';
import { uiCopy } from '@/lib/podcast-title/uiCopy';
import type { StoredEpisodeAnalysis } from '@/lib/podcast-title/types';

function Copy({ value }: { value: string }) { const [copied, setCopied] = useState(false); async function copy() { try { await navigator.clipboard.writeText(value); } catch { const area = document.createElement('textarea'); area.value = value; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); } setCopied(true); setTimeout(() => setCopied(false), 2000); } return <button type="button" onClick={() => void copy()} className="min-h-[44px] rounded border border-[var(--border)] px-3 text-sm">{copied ? uiCopy.copied : uiCopy.copy}</button>; }

function Info({ label, value, testId }: { label: string; value: string | number | null | undefined; testId?: string }) { return <div><dt className="text-sm text-[var(--muted)]">{label}</dt><dd data-testid={testId} dir="auto" style={{ unicodeBidi: 'isolate' }} className="font-medium">{value === null || value === undefined || value === '' ? '-' : value}</dd></div>; }

export function ResultPanel({ record }: { record?: StoredEpisodeAnalysis }) {
  if (!record) return null;
  const { result, theme } = record;
  const decision = result.decision === 'KEEP' ? uiCopy.decisionKeep : result.decision === 'HUMAN_REVIEW' ? uiCopy.decisionHumanReview : record.input.currentTitle?.trim() ? uiCopy.decisionChange : uiCopy.decisionCreate;
  const evidence = result.currentTitleKeywordEvidence;
  const currentTitlePhrase = evidence?.status === 'available' ? evidence.phrase : null;
  const currentTitleVolume = evidence?.status === 'available' ? evidence.searchVolume : null;
  const titleTestIds = ['podcast-title-suggestion-0', 'podcast-title-suggestion-1', 'podcast-title-suggestion-2'];

  return <section data-testid={`podcast-result-${record.episodeId}`} dir="rtl" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-live="polite">
    <div className="flex flex-wrap items-center gap-3"><span data-testid="podcast-decision" className={`rounded-full px-3 py-1 text-sm font-bold ${result.decision === 'HUMAN_REVIEW' ? 'bg-amber-500/20 text-amber-300' : 'bg-[var(--accent)] text-white'}`}>{decision}</span><span>{theme.confidence}%</span></div>
    {result.decision === 'HUMAN_REVIEW' && <p className="mt-3 text-amber-300">{uiCopy.lowConfidence}</p>}
    <dl className="mt-4 grid gap-3 sm:grid-cols-2"><Info label={uiCopy.primaryTheme} value={theme.theme}/><Info label={uiCopy.listenerIntent} value={theme.listenerIntent}/>{record.input.currentTitle && <Info label={uiCopy.currentTitleScore} value={result.currentTitleScore}/>}<Info label={uiCopy.apiUsage} value={`${result.llmCallsUsed}`}/></dl>
    {result.fallbackUsed && <p className="mt-3 text-sm">{uiCopy.fallbackUsed}</p>}
    <div className="mt-5 space-y-3">
      <section data-testid="podcast-recommendation-evidence"><h2 className="font-bold">{uiCopy.recommendedTitle}</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><Info label={uiCopy.selectedKeyword} value={result.selectedKeyword?.phrase} testId="podcast-selected-phrase"/><Info label={uiCopy.searchVolume} value={result.selectedKeyword?.searchVolume} testId="podcast-selected-volume"/></dl></section>
      <section data-testid="podcast-current-title-evidence"><h2 className="font-bold">{uiCopy.currentTitle}</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><Info label={uiCopy.selectedKeyword} value={currentTitlePhrase} testId="podcast-current-title-phrase"/><Info label={uiCopy.searchVolume} value={currentTitleVolume} testId="podcast-current-title-volume"/></dl></section>
      <h2 className="font-bold">{uiCopy.alternativeTitles}</h2>
      {result.titles.map((title, index) => <div key={`${title.role}-${title.title}`} className="flex items-center justify-between gap-3 rounded border border-[var(--border)] p-3"><p data-testid={titleTestIds[index]} dir="auto" style={{ unicodeBidi: 'isolate' }}>{title.title} <small>({title.title.length}/{record.input.currentTitle ? 200 : 200})</small></p><Copy value={title.title}/></div>)}
      <h2 className="font-bold">{uiCopy.shortDescription}</h2><div className="flex gap-3 rounded border border-[var(--border)] p-3"><p dir="auto" className="flex-1" style={{ unicodeBidi: 'isolate' }}>{result.description} <small>({result.description.length})</small></p><Copy value={result.description}/></div>{theme.excludedTopics.length > 0 && <Info label={uiCopy.warnings} value={theme.excludedTopics.join(', ')}/>}</div>
  </section>;
}