import copy from './gbp-magnet-page-copy.json';

export type GbpMagnetCopyKey = keyof typeof copy;
export const PAGE_COPY: Record<GbpMagnetCopyKey, string> = copy;
