import crypto from 'crypto'; import fs from 'fs'; import path from 'path';
import type { PodcastProfile, StoredEpisodeAnalysis } from './types';
import { upgradeLegacyPodcastProfile, validatePodcastProfile } from './validation';
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const base = (root?: string) => path.resolve(root ?? path.join(process.cwd(), 'data', 'podcast-title-tool'));
const safe = (root: string, profileId: string, ...parts: string[]) => ID.test(profileId) ? path.resolve(root, 'podcasts', profileId, ...parts) : null;
export function getPodcastProfilePath(profileId: string, root?: string) { const b = base(root); const result = safe(b, profileId, 'profile.json'); return result?.startsWith(`${b}${path.sep}`) ? result : null; }
export function getEpisodeAnalysisPath(profileId: string, episodeId: string, root?: string) { const b = base(root); if (!ID.test(profileId) || !ID.test(episodeId)) return null; const result = path.resolve(b, 'podcasts', profileId, 'episodes', `${episodeId}.json`); return result.startsWith(`${b}${path.sep}`) ? result : null; }
function read<T>(file: string | null): T | null { if (!file || !fs.existsSync(file)) return null; try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; } }
function write(file: string | null, value: unknown) { if (!file) return false; const tmp = `${file}.${crypto.randomUUID()}.tmp`; try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8'); fs.renameSync(tmp, file); return true; } catch { fs.rmSync(tmp, { force: true }); return false; } }
export async function listPodcastProfiles(root?: string) { const dir = path.join(base(root), 'podcasts'); if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter(v => getPodcastProfilePath(v, root) && fs.existsSync(getPodcastProfilePath(v, root)!)); }
export async function readPodcastProfile(profileId: string, root?: string) { const value = read<unknown>(getPodcastProfilePath(profileId, root)); const profile = upgradeLegacyPodcastProfile(value); if (!profile) return null; if (profile !== value && !write(getPodcastProfilePath(profile.id, root), profile)) return null; return profile; }
export async function writePodcastProfileAtomic(profile: PodcastProfile, root?: string) { return validatePodcastProfile(profile) && write(getPodcastProfilePath(profile.id, root), profile); }
export async function readEpisodeAnalysis(profileId: string, episodeId: string, root?: string) { return read<StoredEpisodeAnalysis>(getEpisodeAnalysisPath(profileId, episodeId, root)); }
export async function listEpisodeAnalyses(profileId: string, root?: string) { const dir = path.dirname(getEpisodeAnalysisPath(profileId, 'placeholder', root) ?? ''); if (!dir || !fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter(v => v.endsWith('.json')).map(v => v.slice(0, -5)).filter(v => ID.test(v)); }
export async function writeEpisodeAnalysisAtomic(record: StoredEpisodeAnalysis, root?: string) { return write(getEpisodeAnalysisPath(record.profileId, record.episodeId, root), record); }
