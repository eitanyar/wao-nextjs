import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ResearchRun } from './types';
import { validateResearchRun } from './validation';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const MAX_RUN_BYTES = 5 * 1024 * 1024;
export interface ResearchRunSummary { runId: string; createdAt: string; updatedAt: string; stage: ResearchRun['stage']; disposition: ResearchRun['disposition']; candidateCount: number; }

function rootDirectory(root?: string): string | null {
  const repositoryRoot = path.resolve(process.cwd());
  if (process.env.NODE_ENV === 'production') {
    const configured = process.env.EXPIRED_DOMAIN_RESEARCH_DATA_DIR;
    if (!configured) return null;
    const resolved = path.resolve(configured);
    return resolved === repositoryRoot || resolved.startsWith(`${repositoryRoot}${path.sep}`) ? null : resolved;
  }
  return path.resolve(root ?? path.join(repositoryRoot, 'data', 'expired-domain-research'));
}

export function getResearchRunPath(runId: string, root?: string): string | null {
  const base = rootDirectory(root);
  if (!base || !SAFE_ID.test(runId)) return null;
  const target = path.resolve(base, `${runId}.json`);
  return target.startsWith(`${base}${path.sep}`) ? target : null;
}

export function writeResearchRunAtomic(run: ResearchRun, root?: string): boolean {
  const target = getResearchRunPath(run.runId, root);
  if (!target || !validateResearchRun(run)) return false;
  const body = `${JSON.stringify(run, null, 2)}\n`;
  if (Buffer.byteLength(body, 'utf8') > MAX_RUN_BYTES) return false;
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temporary, body, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
    return true;
  } catch {
    fs.rmSync(temporary, { force: true });
    return false;
  }
}

export function readResearchRun(runId: string, root?: string): ResearchRun | null {
  const target = getResearchRunPath(runId, root);
  if (!target) return null;
  try {
    const bytes = fs.statSync(target).size;
    if (bytes > MAX_RUN_BYTES) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(target, 'utf8'));
    return validateResearchRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function listResearchRuns(root?: string): ResearchRunSummary[] {
  const base = rootDirectory(root);
  if (!base || !fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .flatMap(entry => {
      const run = readResearchRun(entry.name.slice(0, -5), root);
      return run ? [{ runId: run.runId, createdAt: run.createdAt, updatedAt: run.updatedAt, stage: run.stage, disposition: run.disposition, candidateCount: run.candidates.length }] : [];
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt) || left.runId.localeCompare(right.runId));
}
