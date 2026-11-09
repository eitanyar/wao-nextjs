/**
 * Server-side loader for the in-repo Israeli locality list used by ./servedAreas: the tracked
 * config/market-scanner/areas.json (generated from docs/research/site-bot/market-scanner-scoring-spec.md
 * by scripts/market-scan/build-config.mjs). Only the matching fields are exposed.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the names live in the JSON).
 */
import areas from '../../../config/market-scanner/areas.json';
import type { Locality } from './servedAreas';

interface AreasConfig { regions: Array<{ cities: Locality[] }> }

export const ISRAELI_LOCALITIES: readonly Locality[] = (areas as unknown as AreasConfig).regions
  .flatMap(region => region.cities)
  .map(({ slug, he_name, he_aliases, he_match_guard }) => ({ slug, he_name, ...(he_aliases ? { he_aliases } : {}), ...(he_match_guard ? { he_match_guard } : {}) }));
