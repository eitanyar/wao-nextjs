'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ACQUISITION_COPY } from '@/lib/site-bot/acquisitionCopy';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';
import type { AuditResult, AuditDimension } from '@/lib/gbp/auditScore';
import { GeoGridVisualizer } from '@/components/geo/GeoGridVisualizer';
import { ScorecardShareSection } from '@/components/site-bot/ScorecardShareSection';
import type { GridRankReport } from '@/lib/geo/gridRank';

interface Candidate {
  placeId: string;
  displayName: string;
  formattedAddress: string;
}

type PageState = 'form' | 'loading' | 'pick' | 'ready' | 'not_found';

const DIY_KEYS = ['categories', 'hours', 'photos'] as const;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function AuditContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>('form');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [gridReport, setGridReport] = useState<GridRankReport | null>(null);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridParams, setGridParams] = useState<{
    businessName: string;
    keyword: string;
    lat: number;
    lng: number;
    placeId?: string;
    phone?: string;
  } | null>(null);

  const fetchGridScan = useCallback(
    async (candidateData: {
      businessName: string;
      keyword: string;
      lat: number;
      lng: number;
      placeId?: string;
      phone?: string;
    }) => {
      setIsGridLoading(true);
      setGridError(null);
      setGridParams(candidateData);
      try {
        const res = await fetchWithTimeout(
          '/api/site-bot/grid-scan',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: candidateData.businessName,
              keyword: candidateData.keyword,
              lat: candidateData.lat,
              lng: candidateData.lng,
              radiusKm: 5,
              gridSize: 3,
              placeId: candidateData.placeId,
              phone: candidateData.phone,
            }),
          },
          30000
        );
        if (!res.ok) {
          setGridError('SCAN_ERROR');
          return;
        }
        const data = await res.json();
        if (data && Array.isArray(data.nodes) && data.summary) {
          setGridReport(data);
        } else {
          setGridError('SCAN_ERROR');
        }
      } catch {
        setGridError('SCAN_ERROR');
      } finally {
        setIsGridLoading(false);
      }
    },
    []
  );

  const fetchResult = useCallback(async (auditId: string, placeId?: string | null) => {
    setState('loading');
    setErrorKey(null);
    setGridReport(null);
    setGridError(null);
    try {
      const query = new URLSearchParams({ auditId });
      if (placeId) query.set('placeId', placeId);
      const res = await fetchWithTimeout(`/api/site-bot/audit-result?${query.toString()}`);
      if (res.status === 429) {
        setErrorKey('FORM_ERROR_RATE');
        setState('form');
        return;
      }
      if (res.status === 404) {
        setState('not_found');
        return;
      }
      if (!res.ok) {
        setErrorKey('FORM_ERROR_GENERIC');
        setState('form');
        return;
      }
      const data = await res.json();
      if (data.status === 'ready' && data.score) {
        setAuditResult(data.score);
        setBusinessName(data.businessName || '');
        setCurrentAuditId(auditId);
        setState('ready');

        if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
          const keyword = data.primaryCategory || data.businessName || '';
          fetchGridScan({
            businessName: data.businessName || '',
            keyword,
            lat: data.location.lat,
            lng: data.location.lng,
            placeId: data.placeId,
            phone: data.phone,
          });
        }
      } else if (data.status === 'pick' && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setCurrentAuditId(auditId);
        setState('pick');
      } else if (data.status === 'not_found') {
        setState('not_found');
      } else {
        setErrorKey('FORM_ERROR_GENERIC');
        setState('form');
      }
    } catch {
      setErrorKey('FORM_ERROR_GENERIC');
      setState('form');
    }
  }, [fetchGridScan]);

  useEffect(() => {
    const auditIdParam = searchParams.get('auditId');
    const placeIdParam = searchParams.get('placeId');
    if (auditIdParam) {
      fetchResult(auditIdParam, placeIdParam);
    }
  }, [searchParams, fetchResult]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = businessNameInput.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    setErrorKey(null);
    try {
      const body: { businessName: string; phone?: string } = {
        businessName: trimmedName,
      };
      if (phoneInput.trim()) {
        body.phone = phoneInput.trim();
      }
      const res = await fetchWithTimeout('/api/site-bot/audit-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        setErrorKey('FORM_ERROR_RATE');
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) {
        setErrorKey('FORM_ERROR_GENERIC');
        setIsSubmitting(false);
        return;
      }
      const data = await res.json();
      if (data.auditId) {
        setCurrentAuditId(data.auditId);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('auditId', data.auditId);
          url.searchParams.delete('placeId');
          window.history.pushState({}, '', url.toString());
        }
        await fetchResult(data.auditId);
      } else {
        setErrorKey('FORM_ERROR_GENERIC');
      }
    } catch {
      setErrorKey('FORM_ERROR_GENERIC');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePickCandidate(candidate: Candidate) {
    if (!currentAuditId) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('auditId', currentAuditId);
      url.searchParams.set('placeId', candidate.placeId);
      window.history.pushState({}, '', url.toString());
    }
    await fetchResult(currentAuditId, candidate.placeId);
  }

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: typeof document !== 'undefined' ? document.title : '',
          url: currentUrl,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      } catch {
        // user aborted or not supported
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      } catch {
        // fallback
      }
    }
    try {
      const el = document.createElement('textarea');
      el.value = currentUrl;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore copy errors
    }
  }, []);

  function renderDimensionCard(dim: AuditDimension) {
    const titleToken = dim.copyToken;
    const statusToken = 'DIM_' + dim.key.toUpperCase() + '_' + dim.status.toUpperCase();
    const badgeToken = 'STATUS_' + dim.status.toUpperCase();
    const title = SCORECARD_COPY[titleToken] || '';
    const statusLine = SCORECARD_COPY[statusToken] || '';
    const badge = SCORECARD_COPY[badgeToken] || '';

    const isDiyFail = dim.status === 'fail' && (DIY_KEYS as readonly string[]).includes(dim.key);
    const diyStepsToken = 'DIY_' + dim.key.toUpperCase() + '_STEPS';
    const diyStepsText = isDiyFail ? SCORECARD_COPY[diyStepsToken] : null;

    let badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontSize: '0.8rem',
      fontWeight: 600,
    };

    if (dim.status === 'pass') {
      badgeStyle = {
        ...badgeStyle,
        color: '#22c55e',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
      };
    } else if (dim.status === 'fail') {
      badgeStyle = {
        ...badgeStyle,
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
      };
    } else {
      badgeStyle = {
        ...badgeStyle,
        color: 'var(--muted)',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border)',
      };
    }

    return (
      <div
        key={dim.key}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
            {title}
          </span>
          <span style={badgeStyle}>{badge}</span>
        </div>
        <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--muted)' }}>
          {statusLine}
        </div>
        {isDiyFail && diyStepsText && (
          <div
            style={{
              marginTop: '8px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                marginBottom: '8px',
                color: 'var(--accent)',
              }}
            >
              {SCORECARD_COPY.DIY_HOWTO_LABEL}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.86rem',
                lineHeight: 1.55,
                color: 'var(--text)',
              }}
            >
              {diyStepsText.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="wao-section">
      <div className="wao-container" style={{ maxWidth: '680px' }}>
        {state === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(74, 222, 128, 0.08)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  color: 'var(--accent)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>{ACQUISITION_COPY.ENTRY_TRUST_BADGE}</span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-rubik), sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                  lineHeight: 1.25,
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {ACQUISITION_COPY.ENTRY_HERO_HEADLINE}
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: 'var(--muted)',
                  margin: 0,
                  maxWidth: '560px',
                }}
              >
                {ACQUISITION_COPY.ENTRY_HERO_SUBTITLE}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                ACQUISITION_COPY.ENTRY_VALUE_PROP_1,
                ACQUISITION_COPY.ENTRY_VALUE_PROP_2,
                ACQUISITION_COPY.ENTRY_VALUE_PROP_3,
              ].map((propText, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(74, 222, 128, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.88rem', lineHeight: 1.45, color: 'var(--text)' }}>
                    {propText}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                    {SCORECARD_COPY.FORM_NAME_LABEL}
                  </label>
                  <input
                    type="text"
                    required
                    value={businessNameInput}
                    onChange={(e) => setBusinessNameInput(e.target.value)}
                    placeholder={SCORECARD_COPY.FORM_NAME_PLACEHOLDER}
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-body), sans-serif',
                      fontSize: '1rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                    {SCORECARD_COPY.FORM_PHONE_LABEL}
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={SCORECARD_COPY.FORM_PHONE_PLACEHOLDER}
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-body), sans-serif',
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {errorKey && (
                  <div style={{ color: '#ef4444', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {SCORECARD_COPY[errorKey] || SCORECARD_COPY.FORM_ERROR_GENERIC}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    padding: '14px 24px',
                    justifyContent: 'center',
                    width: '100%',
                    marginTop: '6px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? SCORECARD_COPY.FORM_LOADING : ACQUISITION_COPY.ENTRY_CTA_BUTTON}
                </button>
              </form>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '32px 24px',
              textAlign: 'center',
              color: 'var(--text)',
              fontSize: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div>{SCORECARD_COPY.FORM_LOADING}</div>
          </div>
        )}

        {state === 'pick' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-rubik), sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {SCORECARD_COPY.FORM_TITLE}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {candidates.map((cand) => (
                <button
                  key={cand.placeId}
                  type="button"
                  onClick={() => handlePickCandidate(cand)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {cand.displayName}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {cand.formattedAddress}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {state === 'ready' && auditResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {businessName && (
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {businessName}
                </div>
              )}
              <h1
                style={{
                  fontFamily: 'var(--font-rubik), sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {SCORECARD_COPY.PAGE_TITLE}
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                {SCORECARD_COPY.PAGE_SUBTITLE}
              </p>
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                padding: '18px 20px',
                fontSize: '1.05rem',
                fontWeight: 600,
                lineHeight: 1.6,
                color: 'var(--text)',
              }}
            >
              {(SCORECARD_COPY.SCORELINE || '')
                .replace('__PASSED__', String(auditResult.passed))
                .replace('__TOTAL__', String(auditResult.total))}
            </div>

            <GeoGridVisualizer
              report={gridReport}
              isLoading={isGridLoading}
              error={gridError}
              onRetry={gridParams ? () => fetchGridScan(gridParams) : undefined}
            />

            {auditResult.dimensions.some((d) => d.status === 'pass') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-rubik), sans-serif',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {SCORECARD_COPY.SEC_FOUND}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {auditResult.dimensions
                    .filter((d) => d.status === 'pass')
                    .map(renderDimensionCard)}
                </div>
              </div>
            )}

            {auditResult.dimensions.some((d) => d.status === 'fail') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-rubik), sans-serif',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {SCORECARD_COPY.SEC_MISSING}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {auditResult.dimensions
                    .filter((d) => d.status === 'fail')
                    .map(renderDimensionCard)}
                </div>
              </div>
            )}

            {auditResult.dimensions.some((d) => d.status === 'unknown') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-rubik), sans-serif',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {SCORECARD_COPY.SEC_UNKNOWN}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {auditResult.dimensions
                    .filter((d) => d.status === 'unknown')
                    .map(renderDimensionCard)}
                </div>
              </div>
            )}

            <ScorecardShareSection
              auditId={currentAuditId || ''}
              auditResult={auditResult}
              businessName={businessName}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '12px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <Link
                href={`/site-bot/start${currentAuditId ? `?auditId=${encodeURIComponent(currentAuditId)}` : ''}`}
                className="btn-primary"
                style={{
                  justifyContent: 'center',
                  padding: '16px 28px',
                  fontSize: '1.05rem',
                  textAlign: 'center',
                }}
              >
                {SCORECARD_COPY.CTA_TRIAL}
              </Link>

              <button
                type="button"
                onClick={handleShare}
                className="btn-outline"
                style={{
                  justifyContent: 'center',
                  padding: '14px 24px',
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  borderColor: copied ? 'var(--accent)' : 'var(--border)',
                  background: copied ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '6px' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {SCORECARD_COPY.CTA_SHARE}
              </button>
            </div>
          </div>
        )}

        {state === 'not_found' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-rubik), sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {SCORECARD_COPY.NOTFOUND_TITLE}
            </h1>
            <p style={{ fontSize: '0.98rem', lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
              {SCORECARD_COPY.NOTFOUND_BODY}
            </p>
            <div style={{ marginTop: '12px' }}>
              <Link
                href="/site-bot/start"
                className="btn-primary"
                style={{
                  justifyContent: 'center',
                  padding: '14px 24px',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {SCORECARD_COPY.CTA_TRIAL}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <section className="wao-section">
          <div className="wao-container" style={{ maxWidth: '640px', textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                margin: '0 auto',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        </section>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
