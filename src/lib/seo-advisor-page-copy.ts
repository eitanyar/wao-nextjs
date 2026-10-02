import copy from './seo-advisor-page-copy.json';

export type SeoAdvisorCopyKey = keyof typeof copy;
export const PAGE_COPY: Record<SeoAdvisorCopyKey, string> = copy;
