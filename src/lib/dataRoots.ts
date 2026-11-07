/**
 * Filesystem roots for per-client, per-site and site-research data.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Each root defaults to <cwd>/data/<name> (byte-identical to the historical
 * hard-coded `path.join(process.cwd(), 'data', ...)`). An env override lets a
 * rehearsal, test or staging run point a root somewhere else so it never
 * touches live client data or tracked repo dirs:
 *
 *   WAO_CLIENTS_DIR        default <cwd>/data/clients        (live production client data)
 *   WAO_SITES_DIR          default <cwd>/data/sites          (generated site records; tracked dir)
 *   WAO_SITE_RESEARCH_DIR  default <cwd>/data/site-research  (research dossiers)
 *
 * Read on every call (not cached) so a test can set the env per case. Modules
 * that historically captured the root in a module-level const still do, which
 * keeps their load-time semantics unchanged.
 */

import path from 'path';

export type DataRootKind = 'clients' | 'sites' | 'siteResearch';

export interface DataRoot {
  /** Absolute directory holding the records. */
  dir: string;
  /**
   * Directory that symlink-safety walks start from. By default this is cwd, so
   * existing "no symlink anywhere under cwd" checks keep covering `data/` itself;
   * with an override it is the override directory.
   */
  walkBase: string;
  overridden: boolean;
}

function overrideFor(kind: DataRootKind): string | undefined {
  // Literal keys only: keeps every env read greppable.
  const raw = kind === 'clients'
    ? process.env.WAO_CLIENTS_DIR
    : kind === 'sites'
      ? process.env.WAO_SITES_DIR
      : process.env.WAO_SITE_RESEARCH_DIR;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

/**
 * Default roots as literal `path.join(process.cwd(), 'data', '<name>')` calls, one per kind,
 * so build-time file tracing (nft) resolves each to a fixed data/<name> directory (excluded in
 * next.config.ts) instead of an unresolvable expression. Keep these literal: no spreads,
 * lookups or variables in the join.
 */
function defaultDir(kind: DataRootKind): string {
  if (kind === 'clients') return path.join(process.cwd(), 'data', 'clients');
  if (kind === 'sites') return path.join(process.cwd(), 'data', 'sites');
  return path.join(process.cwd(), 'data', 'site-research');
}

export function dataRoot(kind: DataRootKind): DataRoot {
  const override = overrideFor(kind);
  if (override !== undefined) {
    const dir = path.resolve(override);
    return { dir, walkBase: dir, overridden: true };
  }
  // One process.cwd() call (inside the literal join); walkBase is that cwd (data/<name> is two levels down).
  const dir = defaultDir(kind);
  return { dir, walkBase: path.dirname(path.dirname(dir)), overridden: false };
}

export function clientsDir(): string {
  return dataRoot('clients').dir;
}

export function sitesDir(): string {
  return dataRoot('sites').dir;
}

export function siteResearchDir(): string {
  return dataRoot('siteResearch').dir;
}
