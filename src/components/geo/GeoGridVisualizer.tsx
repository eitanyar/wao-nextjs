'use client';

import React from 'react';
import type { GridRankReport } from '@/lib/geo/gridRank';
import { calculateBearing } from '@/lib/geo/gridRank';
import { GRID_COPY, getRankBadgeStyle, getCardinalDirection } from '@/lib/geo/gridRankDisplay';

export interface GeoGridVisualizerProps {
  report: GridRankReport | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function GeoGridVisualizer({ report, isLoading, error, onRetry }: GeoGridVisualizerProps) {
  if (isLoading) {
    return (
      <div
        style={{
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: 'var(--radius-md, 12px)',
          background: 'var(--surface, #1e293b)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--border, rgba(255, 255, 255, 0.1))',
              borderTopColor: 'var(--accent, #3b82f6)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text, #f8fafc)' }}>
            {GRID_COPY.SCAN_LOADING}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '110px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                opacity: 0.6,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md, 12px)',
          background: 'rgba(239, 68, 68, 0.05)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 500 }}>
          {GRID_COPY.SCAN_ERROR}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.2))',
              color: 'var(--text, #f8fafc)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {GRID_COPY.RETRY_BUTTON}
          </button>
        )}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { summary, nodes } = report;
  const sortedNodes = [...nodes].sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));

  const visibilityColor =
    summary.top3Percentage >= 50
      ? '#22c55e'
      : summary.top3Percentage >= 20
        ? '#f59e0b'
        : '#ef4444';

  return (
    <div
      style={{
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        borderRadius: 'var(--radius-md, 12px)',
        background: 'var(--surface, #1e293b)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Section Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-rubik), sans-serif',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--text, #f8fafc)',
            margin: 0,
          }}
        >
          {GRID_COPY.SECTION_TITLE}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>
          {GRID_COPY.SECTION_SUBTITLE}
        </p>
      </div>

      {/* Top Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Top-3 Visibility Metric */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--bg, #0f172a)',
            border: `1px solid ${visibilityColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
              {GRID_COPY.TOP3_VISIBILITY}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)', opacity: 0.8 }}>
              {summary.top3Count} / {summary.totalNodes}
            </span>
          </div>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: visibilityColor,
              fontFamily: 'var(--font-rubik), sans-serif',
            }}
          >
            {summary.top3Percentage}%
          </span>
        </div>

        {/* Average Rank Pill */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--bg, #0f172a)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
            {GRID_COPY.AVG_RANK}
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text, #f8fafc)',
              fontFamily: 'var(--font-rubik), sans-serif',
            }}
          >
            {summary.averageRank !== null ? `#${summary.averageRank}` : '—'}
          </span>
        </div>

        {/* Market Leader Benchmark */}
        {summary.marketLeader && summary.marketLeader.name && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--bg, #0f172a)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>
              {GRID_COPY.MARKET_LEADER}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text, #f8fafc)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={summary.marketLeader.name}
            >
              {summary.marketLeader.name} ({summary.marketLeader.top3Percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* 3x3 Coordinate Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {sortedNodes.map((node) => {
          const isCenter = node.row === 1 && node.col === 1;
          const badge = getRankBadgeStyle(node.rank);
          const topCompetitor = node.rank !== 1 && node.top3Places?.[0]?.name ? node.top3Places[0].name : null;
          const bearingDeg =
            typeof node.bearingDeg === 'number'
              ? node.bearingDeg
              : calculateBearing(report.center, { lat: node.lat, lng: node.lng });

          return (
            <div
              key={`node-${node.row}-${node.col}`}
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                padding: '10px 8px',
                background: isCenter
                  ? 'rgba(59, 130, 246, 0.08)'
                  : 'var(--bg, #0f172a)',
                border: isCenter
                  ? '1px solid var(--accent, #3b82f6)'
                  : '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '105px',
                minWidth: 0,
                textAlign: 'center',
                boxShadow: isCenter ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
              }}
            >
              {/* Node location tag */}
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isCenter ? 700 : 500,
                  color: isCenter ? 'var(--accent, #3b82f6)' : 'var(--muted, #94a3b8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {isCenter
                  ? GRID_COPY.CENTER_NODE
                  : `${Math.round(node.distanceKm || report.radiusKm)} ${GRID_COPY.KM_UNIT} ${getCardinalDirection(bearingDeg)}`}
              </div>

              {/* Center Rank Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: badge.bg,
                  border: badge.border,
                  color: badge.color,
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-rubik), sans-serif',
                  margin: '4px 0',
                }}
              >
                {badge.label}
              </div>

              {/* Competitor / Subtext */}
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--muted, #94a3b8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  opacity: 0.85,
                  minHeight: '14px',
                }}
                title={topCompetitor ? `#1: ${topCompetitor}` : undefined}
              >
                {topCompetitor ? `#1: ${topCompetitor}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
