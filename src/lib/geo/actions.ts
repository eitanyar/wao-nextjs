import fs   from 'fs';
import path from 'path';

export interface GeoAction {
  actionId:           string;
  clientId:           string;
  rank:               number;
  query:              string;
  rankingUrl:         string;
  implementationMode: 'enhance' | 'create';
  actionType:         'faq_block' | 'definition_box' | 'table';
  priority:           'HIGH' | 'MEDIUM' | 'LOW';
  score:              number;
  impressions:        number;
  clicks:             number;
  ctr:                number;
  status:             'generated' | 'sent' | 'approved' | 'published' | 'verified' | 'done' | 'superseded';
  generatedAt:        string;
  /**
   * Set on actions moved into tasks/geo/_archive/ by
   * scripts/geo-generate-content.mjs when a regeneration replaces them.
   * The old actionId still resolves via findActionById (archive is a read
   * fallback) so a late WhatsApp link never 404s.
   */
  supersededAt?:      string;
  supersededBy?:      string;
  /**
   * Publish path for the /geo/action page (Path A auto-publish vs Path B manual).
   * Distinct from `implementationMode` above (enhance/create page content strategy —
   * used by the GSC/Pareto generation pipeline). Absent on older action files → treat as 'manual'.
   */
  publishMode?:       'auto' | 'manual';
  /**
   * Cannibalization diagnosis from scripts/gsc-pareto.mjs (checkCannibalization).
   * Absent/undefined on actions generated before this was wired through, and
   * on actions where no cannibalization signal was detected.
   */
  cannibalFlag?:      'REVIEW';
  cannibalReasons?:   ('MULTI_URL' | 'HEAD_TERM_ON_LOCATION')[];
  cannibalUrls?:      { url: string; impressions: number; position: number }[];
  /** Gate-derived triage signal, set by scripts/geo-generate-content.mjs — 'autoship' means all
   * three static gates (register/grounding/schema) plus confidence scoring cleared cleanly. */
  shipDecision?:      'autoship' | 'review';
  confidence?:        number;
  /**
   * Internal WAO staff review gate (review queue, 2026-08-17) — distinct from `status: 'done'`,
   * which is the CLIENT marking their own implementation complete. This is the human-in-the-loop
   * approval that must happen BEFORE a staffer is allowed to send the WhatsApp approval link.
   * `approvedBy` is a free-text reviewer name, deliberately not hard-wired to any one person —
   * per Lior's sequencing call (2026-08-17), the review queue must support multiple reviewers.
   */
  approvedBy?:        string;
  approvedAt?:        string;
  /** Set when a reviewer edits Q&A text directly (2026-08-17) — always
   * clears approvedBy/approvedAt, since an edit after approval must be
   * re-reviewed, never silently ship an approved-then-changed answer. */
  lastEditedBy?:      string;
  lastEditedAt?:      string;
  /**
   * Distinctiveness critic result (2026-08-17, src/lib/geo/critic.ts) —
   * on-demand only, triggered by a reviewer in the dashboard, never run
   * automatically by the generation pipeline. `flagsActedOn` is set by the
   * reviewer afterward (did the flags change what they did) — this is the
   * raw data Lior's validation needs: flag hit rate + implied time impact.
   * Not yet trusted at production scale; see critic.ts's file header.
   */
  criticResult?: {
    distinctive:   boolean;
    flags:         string[];
    reasons:       string[];
    citationNote:  string;
    checkedAt:     string;
    flagsActedOn?: boolean; // set when reviewer records whether the flags changed their decision
  };
  content: {
    hebrewContent:        string;
    placementInstruction: string;
    metaDescription:      string;
    jsonLd:               Record<string, unknown>;
    tamarNotes:           string;
    noaChanges:           string | null;
    registerScore?:       number;
    groundingRisk?:       'low' | 'medium' | 'high';
    factualClaims?:       string[];
    schemaValid?:          boolean;
  };
}

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

// A client's live actions live in tasks/geo/; superseded ones are moved to
// tasks/geo/_archive/ by scripts/geo-generate-content.mjs rather than
// deleted, so an old WhatsApp link still resolves. Live dir first so a live
// action always wins over a same-id archived leftover.
function actionDirsForClient(clientId: string): string[] {
  const liveDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
  const archiveDir = path.join(liveDir, '_archive');
  return [liveDir, archiveDir].filter(fs.existsSync);
}

export function findActionById(actionId: string): GeoAction | null {
  // actionId format: {clientId}-{rank}-{slug}
  // Extract clientId from the prefix before the first digit group
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    for (const actionsDir of actionDirsForClient(clientId)) {
      for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
        const action = JSON.parse(
          fs.readFileSync(path.join(actionsDir, file), 'utf8')
        ) as GeoAction;
        if (action.actionId === actionId) return action;
      }
    }
  }
  return null;
}

// Intentionally live-dir only (not archive): this list drives the client's
// working stepper/progress UI (current-of-total, "all done" state), which
// must reflect the current active batch, not superseded history.
// findActionById above is the one that reaches into _archive/, so an old
// actionId still resolves on its own action page even though it has dropped
// out of this list.
export function getClientActions(clientId: string): GeoAction[] {
  const dir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as GeoAction)
    .sort((a, b) => a.rank - b.rank);
}

export function getClientActionCount(clientId: string): number {
  return getClientActions(clientId).length;
}

export function updateActionStatus(actionId: string, status: GeoAction['status']): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId === actionId) {
        fs.writeFileSync(fp, JSON.stringify({ ...action, status }, null, 2), 'utf8');
        return true;
      }
    }
  }
  return false;
}

/**
 * Sets the internal WAO-staff approval gate on an action (review queue,
 * 2026-08-17) — the human-in-the-loop checkpoint before a staffer is
 * permitted to send the WhatsApp approval link. Does NOT touch `status`;
 * status stays 'generated' until sent, and separately becomes 'done' when
 * the CLIENT marks their own implementation complete (see done/route.ts).
 * Approval and send/done are independent axes on purpose — approval gates
 * WAO's own send action, it isn't a proxy for client-side completion.
 */
export function approveAction(actionId: string, reviewerName: string): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId === actionId) {
        fs.writeFileSync(
          fp,
          JSON.stringify({ ...action, approvedBy: reviewerName, approvedAt: new Date().toISOString() }, null, 2),
          'utf8'
        );
        return true;
      }
    }
  }
  return false;
}

/** Reverts an approval — lets a reviewer undo a mistaken batch/individual approve. */
export function unapproveAction(actionId: string): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId === actionId) {
        const { approvedBy: _drop, approvedAt: _drop2, ...rest } = action;
        void _drop; void _drop2;
        fs.writeFileSync(fp, JSON.stringify(rest, null, 2), 'utf8');
        return true;
      }
    }
  }
  return false;
}

/**
 * Fast-path batch approval — the throughput lever for the 250-client/180-day
 * plan (Lior, 2026-08-17): approve every action in this client's queue that
 * cleared ALL of autoship + no cannibalization flag + low grounding risk,
 * in one call, so a reviewer only hand-reviews the flagged minority.
 * Returns the list of actionIds actually approved.
 */
export function batchApproveClean(clientId: string, reviewerName: string): string[] {
  const approved: string[] = [];
  for (const action of getClientActions(clientId)) {
    if (action.approvedBy) continue; // already approved, skip
    if (action.status === 'superseded') continue;
    const clean =
      action.shipDecision === 'autoship' &&
      !action.cannibalFlag &&
      (action.content?.groundingRisk ?? 'low') === 'low';
    if (clean && approveAction(action.actionId, reviewerName)) {
      approved.push(action.actionId);
    }
  }
  return approved;
}

export interface QAItem {
  question: string;
  answer:   string;
}

/**
 * Extracts the current Q&A pairs for a faq_block action, from the
 * structured jsonLd.mainEntity (the source of truth this edit function
 * also writes back to) rather than parsing the HTML.
 */
export function getActionQA(action: GeoAction): QAItem[] {
  const entities = action.content.jsonLd?.mainEntity;
  const list = Array.isArray(entities) ? entities : entities ? [entities] : [];
  return list.map((e: Record<string, unknown>) => ({
    question: String(e?.name ?? ''),
    answer:   String((e?.acceptedAnswer as Record<string, unknown> | undefined)?.text ?? ''),
  }));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Admin-edit for a faq_block action's Q&A text (review queue item 2a,
 * 2026-08-17). Rebuilds BOTH content.jsonLd.mainEntity and
 * content.hebrewContent from the edited pairs — full regeneration, not
 * targeted schema-node patching (patching was explicitly deferred by Lior,
 * 2026-08-17: premature optimization at current client/API-call volume,
 * revisit if/when volume makes it a real cost). Preserves the original
 * wrapper tag/class/H2 title from the existing hebrewContent when it
 * matches the expected shape, so a hand-authored wrapper style isn't
 * clobbered; falls back to the standard faq-block template otherwise.
 * Clears any existing approval — an edited answer must be re-reviewed.
 */
export function updateActionQA(actionId: string, items: QAItem[], editorName: string): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId !== actionId) continue;
      if (action.actionType !== 'faq_block') return false;

      const mainEntity = items.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      }));

      const wrapperMatch = action.content.hebrewContent.match(
        /^<(section|div)\s+class="([^"]+)">\s*<h2>([\s\S]*?)<\/h2>/
      );
      const wrapperTag   = wrapperMatch?.[1] ?? 'div';
      const wrapperClass = wrapperMatch?.[2] ?? 'faq-block';
      const title        = wrapperMatch?.[3] ?? action.query;

      const itemsHtml = items
        .map(({ question, answer }) =>
          `  <div class="faq-item">\n    <h3>${escapeHtml(question)}</h3>\n    <p>${escapeHtml(answer)}</p>\n  </div>`
        )
        .join('\n');

      const hebrewContent =
        `<${wrapperTag} class="${wrapperClass}">\n  <h2>${title}</h2>\n${itemsHtml}\n</${wrapperTag}>`;

      const updated: GeoAction = {
        ...action,
        content: {
          ...action.content,
          hebrewContent,
          jsonLd: { ...action.content.jsonLd, mainEntity },
        },
        lastEditedBy: editorName,
        lastEditedAt: new Date().toISOString(),
        approvedBy: undefined,
        approvedAt: undefined,
      };
      fs.writeFileSync(fp, JSON.stringify(updated, null, 2), 'utf8');
      return true;
    }
  }
  return false;
}

/** Persists a critic run's result onto the action file. See GeoAction.criticResult doc comment. */
export function saveCriticResult(
  actionId: string,
  result: { distinctive: boolean; flags: string[]; reasons: string[]; citationNote: string }
): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId !== actionId) continue;
      const updated: GeoAction = {
        ...action,
        criticResult: { ...result, checkedAt: new Date().toISOString() },
      };
      fs.writeFileSync(fp, JSON.stringify(updated, null, 2), 'utf8');
      return true;
    }
  }
  return false;
}

/** Records whether the reviewer's decision was actually changed by the critic's flags — the flag-hit-rate signal Lior's validation needs. */
export function recordCriticFlagsActedOn(actionId: string, actedOn: boolean): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId !== actionId || !action.criticResult) continue;
      const updated: GeoAction = {
        ...action,
        criticResult: { ...action.criticResult, flagsActedOn: actedOn },
      };
      fs.writeFileSync(fp, JSON.stringify(updated, null, 2), 'utf8');
      return true;
    }
  }
  return false;
}

export function updateActionPublishMode(actionId: string, publishMode: 'auto' | 'manual'): boolean {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];

  for (const clientId of clients) {
    const actionsDir = path.join(CLIENTS_DIR, clientId, 'tasks', 'geo');
    if (!fs.existsSync(actionsDir)) continue;
    for (const file of fs.readdirSync(actionsDir).filter(f => f.endsWith('.json'))) {
      const fp = path.join(actionsDir, file);
      const action = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoAction;
      if (action.actionId === actionId) {
        fs.writeFileSync(fp, JSON.stringify({ ...action, publishMode }, null, 2), 'utf8');
        return true;
      }
    }
  }
  return false;
}
