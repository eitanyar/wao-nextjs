'use client';

import React, { useState } from 'react';
import type { AuditResult } from '@/lib/gbp/auditScore';
import {
  formatWhatsAppShareMessage,
  buildWhatsAppShareUrl,
  formatCommunityPost,
  getOutboundHookForAudit,
} from '@/lib/site-bot/shareUtils';
import {
  SHARE_DISPLAY_COPY,
  getFailingDimensionLabel,
} from '@/lib/site-bot/acquisitionShareDisplay';

export interface ScorecardShareSectionProps {
  auditId: string;
  auditResult: AuditResult;
  businessName?: string;
}

export function ScorecardShareSection({
  auditId,
  auditResult,
}: ScorecardShareSectionProps) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'community' | 'outbound'>('whatsapp');
  const [waMode, setWaMode] = useState<'peer' | 'marketer'>('peer');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => {
          setCopiedKey((prev) => (prev === key ? null : prev));
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const waMessage = formatWhatsAppShareMessage({ mode: waMode, auditId });
  const waUrl = buildWhatsAppShareUrl({ auditId, mode: waMode });
  const communityPost = formatCommunityPost({ auditId });
  const outboundHook = getOutboundHookForAudit({ auditResult, auditId });

  return (
    <div
      dir="rtl"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-rubik), sans-serif',
            fontWeight: 700,
            fontSize: '1.15rem',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          {SHARE_DISPLAY_COPY.SECTION_TITLE}
        </h3>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {SHARE_DISPLAY_COPY.SECTION_SUBTITLE}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: activeTab === 'whatsapp' ? 'var(--accent)' : 'var(--border)',
            background: activeTab === 'whatsapp' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'whatsapp' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'whatsapp' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {SHARE_DISPLAY_COPY.TAB_WHATSAPP}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: activeTab === 'community' ? 'var(--accent)' : 'var(--border)',
            background: activeTab === 'community' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'community' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'community' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {SHARE_DISPLAY_COPY.TAB_COMMUNITY}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outbound')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: activeTab === 'outbound' ? 'var(--accent)' : 'var(--border)',
            background: activeTab === 'outbound' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'outbound' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'outbound' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {SHARE_DISPLAY_COPY.TAB_OUTBOUND}
        </button>
      </div>

      {activeTab === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setWaMode('peer')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid',
                borderColor: waMode === 'peer' ? 'var(--accent)' : 'var(--border)',
                background: waMode === 'peer' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                color: waMode === 'peer' ? 'var(--accent)' : 'var(--muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {SHARE_DISPLAY_COPY.MODE_PEER_LABEL}
            </button>
            <button
              type="button"
              onClick={() => setWaMode('marketer')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid',
                borderColor: waMode === 'marketer' ? 'var(--accent)' : 'var(--border)',
                background: waMode === 'marketer' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                color: waMode === 'marketer' ? 'var(--accent)' : 'var(--muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {SHARE_DISPLAY_COPY.MODE_MARKETER_LABEL}
            </button>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {waMessage}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: '#25D366',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>{SHARE_DISPLAY_COPY.BTN_WHATSAPP_DIRECT}</span>
            </a>

            <button
              type="button"
              onClick={() => handleCopy('wa', waMessage)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: copiedKey === 'wa' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                color: copiedKey === 'wa' ? 'var(--accent)' : 'var(--text)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedKey === 'wa' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{SHARE_DISPLAY_COPY.LABEL_COPIED}</span>
                </>
              ) : (
                <span>{SHARE_DISPLAY_COPY.BTN_COPY_MESSAGE}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--text)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)' }}>
              {communityPost.headline}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {communityPost.body}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', direction: 'ltr', textAlign: 'right' }}>
              {communityPost.deepLink}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => handleCopy('community', communityPost.fullPost)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: copiedKey === 'community' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                color: copiedKey === 'community' ? 'var(--accent)' : 'var(--text)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedKey === 'community' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{SHARE_DISPLAY_COPY.LABEL_COPIED}</span>
                </>
              ) : (
                <span>{SHARE_DISPLAY_COPY.BTN_COPY_POST}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'outbound' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              alignSelf: 'flex-start',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{SHARE_DISPLAY_COPY.LABEL_OUTBOUND_DETECTED}</span>
            <strong style={{ color: 'var(--accent)' }}>
              {getFailingDimensionLabel(outboundHook.failingDimension)}
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>
              {SHARE_DISPLAY_COPY.LABEL_HOOK_STEP_1}
            </span>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {outboundHook.fullMessage}
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleCopy('outbound_step1', outboundHook.fullMessage)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: copiedKey === 'outbound_step1' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                  color: copiedKey === 'outbound_step1' ? 'var(--accent)' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {copiedKey === 'outbound_step1' ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{SHARE_DISPLAY_COPY.LABEL_COPIED}</span>
                  </>
                ) : (
                  <span>{SHARE_DISPLAY_COPY.BTN_COPY_HOOK}</span>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>
              {SHARE_DISPLAY_COPY.LABEL_HOOK_STEP_2}
            </span>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {outboundHook.fullFollowupMessage}
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleCopy('outbound_step2', outboundHook.fullFollowupMessage)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: copiedKey === 'outbound_step2' ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg)',
                  color: copiedKey === 'outbound_step2' ? 'var(--accent)' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {copiedKey === 'outbound_step2' ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{SHARE_DISPLAY_COPY.LABEL_COPIED}</span>
                  </>
                ) : (
                  <span>{SHARE_DISPLAY_COPY.BTN_COPY_FOLLOWUP}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
