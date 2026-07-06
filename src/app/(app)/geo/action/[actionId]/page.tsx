import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { findActionById, getClientActions } from '@/lib/geo/actions';
import { getClientRecord } from '@/lib/geo/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import CopyAnnouncer   from '@/components/geo/CopyAnnouncer';
import StatusBar       from '@/components/geo/StatusBar';
import ActionHeader    from '@/components/geo/ActionHeader';
import PathCard        from '@/components/geo/PathCard';
import AutoPathPanel   from '@/components/geo/AutoPathPanel';
import PlatformSelect  from '@/components/geo/PlatformSelect';
import InstructionSteps from '@/components/geo/InstructionSteps';
import ContentBlock    from '@/components/geo/ContentBlock';
import PlacementBlock  from '@/components/geo/PlacementBlock';
import CodeBlock       from '@/components/geo/CodeBlock';
import MarkDoneBar     from '@/components/geo/MarkDoneBar';
import NextActionLink  from '@/components/geo/NextActionLink';

// Tokenized client URL — never indexed.
export const metadata: Metadata = {
  robots: { index: false },
};

export default async function GeoActionPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId: rawId } = await params;
  const actionId = decodeURIComponent(rawId);
  const action = findActionById(actionId);
  if (!action) notFound();

  // Ownership check: the session's client may only view its own actions.
  // Middleware only confirms SOME valid session — not that it matches this actionId.
  const jar         = await cookies();
  const token       = jar.get(COOKIE_NAME)?.value ?? '';
  const sessionClientId = await verifySessionToken(token);
  if (!sessionClientId || sessionClientId !== action.clientId) notFound();

  const client        = getClientRecord(action.clientId);
  const wpConnected    = client?.wpConnected ?? false;
  const platform       = client?.platform ?? null;
  const publishMode: 'auto' | 'manual' = action.publishMode ?? 'manual';
  const isDone         = action.status === 'done';
  const isPathA        = wpConnected && publishMode === 'auto';
  const locked         = isDone && publishMode === 'auto';

  const allActions = getClientActions(action.clientId);
  const currentIdx = allActions.findIndex((a) => a.actionId === actionId);
  const nextAction = allActions[currentIdx + 1] ?? null;
  const allDone    = allActions.length > 0 && allActions.every((a) => a.status === 'done');

  const placementUrl = action.rankingUrl;
  const contentHtml  = action.content.hebrewContent;
  const schemaJson   = JSON.stringify(
    { '@context': 'https://schema.org', ...action.content.jsonLd },
    null,
    2
  );

  return (
    <CopyAnnouncer>
      <main className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32" dir="rtl">
        <StatusBar
          status={isDone ? 'done' : 'pending'}
          current={currentIdx + 1}
          total={allActions.length}
        />

        <ActionHeader title={action.query} url={placementUrl} />

        <PathCard
          actionId={actionId}
          wpConnected={wpConnected}
          mode={publishMode}
          locked={locked}
        />

        {isPathA ? (
          <AutoPathPanel />
        ) : (
          <>
            {!wpConnected && (
              <PlatformSelect clientId={action.clientId} initialPlatform={platform} />
            )}
            <InstructionSteps>
              <ContentBlock html={contentHtml} platform={platform} />
              <PlacementBlock instruction={action.content.placementInstruction} url={placementUrl} />
              <CodeBlock json={schemaJson} platform={platform} />
            </InstructionSteps>
            <MarkDoneBar
              actionId={actionId}
              initialDone={isDone}
              nextActionId={nextAction?.actionId ?? null}
            />
          </>
        )}

        {allDone && <NextActionLink />}
      </main>
    </CopyAnnouncer>
  );
}
