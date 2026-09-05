import {
  readAutonomyPolicy,
  readAutonomousActionEvents,
  writeAutonomyPolicy,
  type AutonomousActionEvent,
  type GoogleAdsAutonomyPolicy,
} from './autonomy';

type PolicyReader = (clientId: string) => GoogleAdsAutonomyPolicy | null;
type EventsReader = (clientId: string) => AutonomousActionEvent[];
type PolicyWriter = (policy: GoogleAdsAutonomyPolicy) => boolean;

interface PolicyRouteDependencies {
  readPolicy?: PolicyReader;
  readEvents?: EventsReader;
  writePolicy?: PolicyWriter;
}

type PermittedPolicyUpdate = {
  killSwitch?: true;
  mode?: 'disabled';
  maxDailyBudgetIls?: number;
  maxBudgetChangePctPerRun?: number;
  maxActionsPerRun?: number;
  cooldownHours?: number;
};

const UPDATE_KEYS = new Set(['killSwitch', 'mode', 'maxDailyBudgetIls', 'maxBudgetChangePctPerRun', 'maxActionsPerRun', 'cooldownHours']);

function validFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parsePermittedUpdate(value: unknown, current: GoogleAdsAutonomyPolicy): PermittedPolicyUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const update = value as Record<string, unknown>;
  const keys = Object.keys(update);
  if (!keys.length || keys.some(key => !UPDATE_KEYS.has(key))) return null;
  if ('killSwitch' in update && update.killSwitch !== true) return null;
  if ('mode' in update && update.mode !== 'disabled') return null;
  if ('maxDailyBudgetIls' in update && (!validFiniteNumber(update.maxDailyBudgetIls) || update.maxDailyBudgetIls > current.maxDailyBudgetIls)) return null;
  if ('maxBudgetChangePctPerRun' in update && (!validFiniteNumber(update.maxBudgetChangePctPerRun) || update.maxBudgetChangePctPerRun > current.maxBudgetChangePctPerRun)) return null;
  if ('maxActionsPerRun' in update && (!Number.isInteger(update.maxActionsPerRun) || (update.maxActionsPerRun as number) < 0 || (update.maxActionsPerRun as number) > current.maxActionsPerRun)) return null;
  if ('cooldownHours' in update && (!validFiniteNumber(update.cooldownHours) || update.cooldownHours < current.cooldownHours)) return null;
  return update as PermittedPolicyUpdate;
}

export async function handleAutonomyPolicyRequest(
  request: Request,
  sessionClientId: string | null,
  dependencies: PolicyRouteDependencies = {},
): Promise<Response> {
  if (!sessionClientId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const readPolicy = dependencies.readPolicy ?? readAutonomyPolicy;
  const readEvents = dependencies.readEvents ?? readAutonomousActionEvents;
  const writePolicy = dependencies.writePolicy ?? writeAutonomyPolicy;
  const current = readPolicy(sessionClientId);

  if (request.method === 'GET') {
    return Response.json({ policy: current, events: readEvents(sessionClientId).slice(-100) });
  }
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!current) return Response.json({ error: 'Policy not found' }, { status: 404 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const update = parsePermittedUpdate(input, current);
  if (!update) return Response.json({ error: 'Only immediate stop or authority-reducing updates are allowed' }, { status: 400 });

  const next: GoogleAdsAutonomyPolicy = { ...current, ...update };
  if (!writePolicy(next)) return Response.json({ error: 'Unable to save policy' }, { status: 500 });
  return Response.json({ policy: next });
}
