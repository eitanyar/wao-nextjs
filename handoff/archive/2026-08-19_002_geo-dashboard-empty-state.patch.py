#!/usr/bin/env python3
# Carrier patch for handoff 2026-08-19_002 — authored by the Strategist, NOT by waoengineer.
# waoengineer runs this file VERBATIM; it must NOT retype any Hebrew byte inside it.
# All Hebrew below is byte-exact final copy (singular male). It is founder-facing and
# still owes Tamar's Sabra pass + Eitan's human gate before deploy — see the spec's Constraints.
#
# Two surgical str.replace edits on the client dashboard:
#   F-03  gate the Google-Ads "Leads" CTA card so GEO-only clients never see it.
#   F-01  replace the empty-state void with a GEO onboarding / expectation hub.
#
# Run from repo root:  python3 handoff/pending/2026-08-19_002_geo-dashboard-empty-state.patch.py

import io

PATH = "src/app/(product)/client/dashboard/page.tsx"

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# --- F-03: gate the Google-Ads "Leads" CTA card (opening) --------------------
old_leads_open = '''      {/* ── Leads CTA (discoverability link to /client/leads — §3.7) ──────── */}
      <div className="mb-8">'''
new_leads_open = '''      {/* ── Leads CTA (discoverability link to /client/leads — §3.7) ──────── */}
      {/* Gated: only clients with a linked Google Ads campaign see this card.
          A GEO-only client has no campaign (googleAdsData === null), so this
          Ads "leads" card is hidden for them. Fixes QA finding F-03 (Ads copy
          contamination on a GEO dashboard). */}
      {googleAdsData && (
      <div className="mb-8">'''
assert src.count(old_leads_open) == 1, "F-03 leads-open anchor not found exactly once"
src = src.replace(old_leads_open, new_leads_open)

# --- F-03: gate the Google-Ads "Leads" CTA card (closing) --------------------
old_leads_close = '''        </Link>
      </div>

      {/* ── Progress bar'''
new_leads_close = '''        </Link>
      </div>
      )}

      {/* ── Progress bar'''
assert src.count(old_leads_close) == 1, "F-03 leads-close anchor not found exactly once"
src = src.replace(old_leads_close, new_leads_close)

# --- F-01: replace the empty-state void with a GEO onboarding hub ------------
old_empty = '''      {all.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="text-4xl mb-4">📋</p>
          <p>אין משימות עדיין. WAO יעדכן אותך בקרוב.</p>
        </div>
      )}'''
new_empty = '''      {all.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-center">
          <p className="text-4xl mb-4">🚀</p>
          <h2 className="text-lg font-bold mb-2">המשימות הראשונות שלך כבר בהכנה</h2>
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-md mx-auto mb-2">הצוות שלנו מנתח עכשיו את האתר ואת נתוני החיפוש שלך. תוך 24 שעות עבודה תקבל את שלוש הפעולות הראשונות לשיפור הנוכחות שלך במנועי החיפוש החכמים.</p>
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-md mx-auto mb-6">נעדכן אותך כאן בלוח וגם בהודעת וואטסאפ, כדי שתוכל לאשר כל פעולה בלחיצה אחת.</p>
          {!clientRecord?.gscConnected ? (
            <a
              href={`/api/geo/gsc/oauth/start?clientId=${encodeURIComponent(clientId)}`}
              className="inline-block rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-5 py-3 font-semibold text-[var(--accent)] hover:border-[var(--accent)]/70 transition-all"
            >
              חבר את Search Console כדי שנתחיל לנתח
            </a>
          ) : (
            <p className="text-green-400 text-sm">Search Console מחובר — כבר אוספים נתונים בשבילך.</p>
          )}
        </div>
      )}'''
assert src.count(old_empty) == 1, "F-01 empty-state anchor not found exactly once"
src = src.replace(old_empty, new_empty)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: dashboard patched (F-03 leads CTA gated, F-01 empty state replaced).")
