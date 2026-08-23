import type { CollectedData } from '../bot/prompts';

/**
 * Core-30 node list generator (VISION.md locked strategy, 2026-08-21).
 *
 * Pure, offline generator for the coverage matrix behind WAO's Site Bot local-SEO
 * product: one page per (service × city) combination, capped at ~30 pages, aimed
 * at surfacing in Google's Local Pack. This module produces ONLY the node list —
 * no HTML rendering, no LLM calls, no facts/content generation. Those are separate,
 * later layers.
 */

export type LocationType = 'service-area' | 'fixed-location' | 'hybrid';

export interface CoreThirtyNode {
  id: string; // ascii, deterministic: `svc{serviceIndex}-city{cityIndex}` — see buildCoreThirtyNodes below
  service: string; // Hebrew service name, verbatim from input
  city: string; // Hebrew city name, verbatim from input
  locationType: LocationType;
}

const SPLIT_PATTERN = /[,\n،]/;

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(SPLIT_PATTERN)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Derives the single `locationType` that applies uniformly to every node produced
 * by a given `buildCoreThirtyNodes` call. A client has one `serviceModel`, so one
 * `locationType` applies across their whole node set — VISION's per-page
 * `locationType` conditional is about framing within a service model, not a
 * per-node lookup.
 *
 * Mapping:
 *   'field'            -> 'service-area'   (van/service-radius trades)
 *   'location'         -> 'fixed-location' (storefront/studio)
 *   'event' | 'mixed'  -> 'hybrid'         (fixed base + on-location work)
 *   'remote' | missing -> 'service-area'   (safe default; never throws)
 */
export function deriveLocationType(serviceModel: CollectedData['serviceModel']): LocationType {
  switch (serviceModel) {
    case 'field':
      return 'service-area';
    case 'location':
      return 'fixed-location';
    case 'event':
    case 'mixed':
      return 'hybrid';
    case 'remote':
    default:
      return 'service-area';
  }
}

/**
 * Builds the core-30 (service x city) node list for a client's Site Bot pages.
 *
 * `id` scheme: `svc{serviceIndex}-city{cityIndex}`, where the indices are the
 * 0-based positions of the service/city in their deduped, parsed source lists
 * (order of first appearance after `businessNiche`/`primaryService` prepend).
 * This keeps ids ascii-safe and stable without transliterating Hebrew.
 *
 * Fail-closed: if either the service list or the city list is empty after
 * parsing, returns `[]` rather than synthesizing placeholder pages.
 *
 * Cap: `opts.maxNodes` (default 30) total nodes, filled round-robin across
 * services (service[0]xcity[0], service[1]xcity[0], ..., service[N-1]xcity[0],
 * service[0]xcity[1], ...) so every service gets at least one page before any
 * service gets a second, as long as `services.length <= maxNodes`.
 */
export function buildCoreThirtyNodes(
  data: CollectedData,
  opts?: { maxNodes?: number }
): CoreThirtyNode[] {
  const maxNodes = opts?.maxNodes ?? 30;

  const services = parseList(data.secondaryServices);
  const anchor = (data.businessNiche ?? data.primaryService ?? '').trim();
  if (anchor && !services.includes(anchor)) {
    services.unshift(anchor);
  }

  const cities = parseList(data.specificCities);

  if (services.length === 0 || cities.length === 0) {
    return [];
  }

  const locationType = deriveLocationType(data.serviceModel);

  const nodes: CoreThirtyNode[] = [];
  // Round-robin: outer loop over city index, inner loop over service index,
  // so each pass through the inner loop adds exactly one city for every
  // service before moving on to the next city.
  outer: for (let cityIdx = 0; cityIdx < cities.length; cityIdx++) {
    for (let svcIdx = 0; svcIdx < services.length; svcIdx++) {
      if (nodes.length >= maxNodes) break outer;
      nodes.push({
        id: `svc${svcIdx}-city${cityIdx}`,
        service: services[svcIdx],
        city: cities[cityIdx],
        locationType,
      });
    }
  }

  return nodes;
}
