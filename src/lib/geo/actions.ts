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
  content: {
    hebrewContent:        string;
    placementInstruction: string;
    metaDescription:      string;
    jsonLd:               Record<string, unknown>;
    tamarNotes:           string;
    noaChanges:           string | null;
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
