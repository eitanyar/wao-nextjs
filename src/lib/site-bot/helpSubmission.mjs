// Client transport only. The server validates consent, identity, storage and idempotency.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const helpAttemptKey = identity => `sitebot-help-attempt:${JSON.stringify([identity.auditId, identity.placeId])}`;

export function createHelpSubmission({ fetchFn, makeId, onState, isCurrent, storage, recoveryOnly = false }) {
  let fingerprint = null;
  let requestId = null;
  let controller = null;
  let disposed = false;
  let inFlight = false;

  return {
    async submit(identity, contact) {
      if (disposed || inFlight || !isCurrent() || !identity || !UUID.test(identity.auditId) ||
        typeof identity.placeId !== 'string' || !identity.placeId.trim() ||
        !contact || contact.privacyAccepted !== true) return;
      const name = typeof contact.name === 'string' ? contact.name.trim() : '';
      const phone = typeof contact.phone === 'string' ? contact.phone.trim() : '';
      const email = typeof contact.email === 'string' ? contact.email.trim() : '';
      if (!name || (!phone && !email)) return;
      const fields = { auditId: identity.auditId, placeId: identity.placeId, name,
        ...(phone ? { phone } : {}), ...(email ? { email } : {}), privacyAccepted: true };
      const nextFingerprint = JSON.stringify(fields);
      const storageKey = helpAttemptKey(identity);
      if (recoveryOnly) {
        try { const marker = storage?.getItem(storageKey); if (!marker || !/^pending:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marker) || (requestId && marker !== `pending:${requestId}`)) { onState('blocked'); return; } }
        catch { onState('blocked'); return; }
      }
      if (fingerprint && fingerprint !== nextFingerprint) { onState('unconfirmed'); return; }
      if (!fingerprint) {
        try {
          const saved = storage?.getItem(storageKey);
          if (saved) {
            if (!saved.startsWith('pending:') || !UUID.test(saved.slice(8))) { onState('unconfirmed'); return; }
            requestId = saved.slice(8);
          }
        } catch { onState('unconfirmed'); return; }
        fingerprint = nextFingerprint;
        requestId ??= makeId();
      }
      if (!UUID.test(requestId)) { onState('unconfirmed'); return; }
      try { storage?.setItem(storageKey, `pending:${requestId}`); }
      catch { onState('unconfirmed'); return; }
      const own = new AbortController();
      controller = own;
      inFlight = true;
      onState('loading');
      const timer = setTimeout(() => own.abort(), 15000);
      try {
        const response = await fetchFn(recoveryOnly ? '/api/site-bot/help-request/recover' : '/api/site-bot/help-request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, ...fields }),
          credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: own.signal,
        });
        const body = response.ok ? await response.json() : null;
        if (disposed || own.signal.aborted || !isCurrent()) return;
        if (response.status === 200 && body?.ok === true && body.requestId === requestId && body.status === 'received') {
          try { storage?.setItem(storageKey, 'received'); } catch { /* receipt remains authoritative */ }
          onState('received');
        } else if (response.status === 400 || response.status === 409 || response.status === 404) {
          fingerprint = null;
          onState('retry');
        } else onState('unconfirmed');
      } catch {
        if (!disposed && !own.signal.aborted && isCurrent()) onState('unconfirmed');
        else if (!disposed && isCurrent()) onState('unconfirmed');
      } finally {
        clearTimeout(timer);
        if (controller === own) controller = null;
        inFlight = false;
      }
    },
    dispose() { disposed = true; controller?.abort(); controller = null; },
  };
}
