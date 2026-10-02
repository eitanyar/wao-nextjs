export type GeoActionViewAccess =
  | { kind: 'render' }
  | { kind: 'login'; nextPath: string }
  | { kind: 'not-found' };

export type GeoActionViewAccessInput = {
  actionExists: boolean;
  adminAuthenticated: boolean;
  sessionClientId: string | null;
  actionClientId: string | null;
  actionPath: string;
};

export function resolveGeoActionViewAccess(input: GeoActionViewAccessInput): GeoActionViewAccess {
  if (!input.actionExists || !input.actionClientId) return { kind: 'not-found' };
  if (input.adminAuthenticated) return { kind: 'render' };
  if (!input.sessionClientId) return { kind: 'login', nextPath: input.actionPath };
  if (input.sessionClientId !== input.actionClientId) return { kind: 'not-found' };
  return { kind: 'render' };
}
