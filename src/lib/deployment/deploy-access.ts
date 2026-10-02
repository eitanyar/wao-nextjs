const SAFE_DEPLOYMENT_SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/;

export function isSafeDeploymentSlug(value: unknown): value is string {
  return typeof value === 'string' && SAFE_DEPLOYMENT_SLUG.test(value);
}
