import { autonomyConsentCopy, AUTONOMY_TERMS_VERSION } from '@/lib/google-ads/autonomyCopy';

interface AutonomyConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}

export function AutonomyConsent({ checked, onChange, compact = false }: AutonomyConsentProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby="autonomy-consent-summary"
        style={{ marginTop: compact ? '3px' : '4px', accentColor: 'var(--accent)', width: '16px', height: '16px', flexShrink: 0 }}
      />
      <span id="autonomy-consent-summary" style={{ fontSize: compact ? '0.82rem' : '0.85rem', color: 'var(--muted)', lineHeight: '1.4', direction: 'rtl' }}>
        <strong>{autonomyConsentCopy.AUTONOMY_CONSENT_LABEL}</strong>
        <span style={{ display: 'block', marginTop: '6px' }}>{autonomyConsentCopy.AUTONOMY_SCOPE_SUMMARY}</span>
        {!compact && <span style={{ display: 'block', marginTop: '6px' }}>{autonomyConsentCopy.AUTONOMY_LIMITS_SUMMARY}</span>}
        <span style={{ display: 'block', marginTop: '6px' }}>{autonomyConsentCopy.AUTONOMY_STOP_SUMMARY}</span>
        {!compact && <span style={{ display: 'block', marginTop: '6px' }}>{autonomyConsentCopy.AUTONOMY_AUDIT_SUMMARY}</span>}
        <span data-autonomy-terms-version={AUTONOMY_TERMS_VERSION} hidden />
      </span>
    </label>
  );
}
