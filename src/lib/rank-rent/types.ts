/**
 * Control-plane contracts for isolated rank-and-rent portfolio sites.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const PORTFOLIO_SCHEMA_VERSION = 1 as const;

export const SITE_LIFECYCLES = [
  'candidate',
  'researching',
  'approved_for_content',
  'approved_for_build',
  'ready_for_manual_launch',
  'live',
  'held',
  'retired',
] as const;

export type SiteLifecycle = (typeof SITE_LIFECYCLES)[number];
export type OwnershipModel = 'wao_owned' | 'client_owned';

export interface RepositoryBinding {
  repositoryId: string;
  status: 'unbound' | 'approved' | 'connected';
  remoteUrl?: string;
}

export interface CloudflarePagesBinding {
  status: 'unbound' | 'approved' | 'connected';
  projectId?: string;
}

export interface ManualApproval {
  approvalId: string;
  requiredFor: SiteLifecycle;
  status: 'pending' | 'approved' | 'rejected' | 'held';
  requestedAt: string;
  resolvedAt?: string;
}

export interface CertificationStatus {
  status: 'not_started' | 'pending' | 'certified' | 'held' | 'rejected';
  certifiedAt?: string;
}

export interface PortfolioEvent {
  eventId: string;
  type: 'created' | 'lifecycle_changed' | 'approval_recorded' | 'certification_recorded' | 'repository_bound' | 'pages_bound' | 'held' | 'retired';
  occurredAt: string;
}

export interface PortfolioSite {
  schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION;
  siteId: string;
  niche: string;
  ownershipModel: OwnershipModel;
  canonicalDomainCandidate: string;
  researchId: string;
  repository: RepositoryBinding;
  cloudflarePages: CloudflarePagesBinding;
  approvals: ManualApproval[];
  certification: CertificationStatus;
  events: PortfolioEvent[];
  lifecycle: SiteLifecycle;
  createdAt: string;
  updatedAt: string;
}

const SITE_LIFECYCLE_TRANSITIONS: Readonly<Record<SiteLifecycle, readonly SiteLifecycle[]>> = {
  candidate: ['researching', 'held', 'retired'],
  researching: ['approved_for_content', 'held', 'retired'],
  approved_for_content: ['approved_for_build', 'held', 'retired'],
  approved_for_build: ['ready_for_manual_launch', 'held', 'retired'],
  ready_for_manual_launch: ['live', 'held', 'retired'],
  live: ['held', 'retired'],
  held: ['researching', 'retired'],
  retired: [],
};

export function transitionSiteLifecycle(current: SiteLifecycle, next: SiteLifecycle): SiteLifecycle {
  if (!SITE_LIFECYCLE_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid portfolio lifecycle transition: ${current} -> ${next}`);
  }

  return next;
}
