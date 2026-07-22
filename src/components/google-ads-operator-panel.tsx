"use client";

import { useMemo, useState } from 'react';
import type { GoogleAdsOperatorApproval, GoogleAdsOperatorTask } from '@/lib/google-ads/operator';

interface GoogleAdsOperatorPanelProps {
  clientId: string;
  tasks: GoogleAdsOperatorTask[];
  approvals: GoogleAdsOperatorApproval[];
}

export default function GoogleAdsOperatorPanel({ clientId, tasks, approvals }: GoogleAdsOperatorPanelProps) {
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [localApprovals, setLocalApprovals] = useState<GoogleAdsOperatorApproval[]>(approvals);

  const approvedTaskIds = useMemo(() => new Set(localApprovals.map((approval) => approval.taskId)), [localApprovals]);

  async function approveTask(task: GoogleAdsOperatorTask) {
    const ok = window.confirm(
      [
        'Approve this Google Ads task?',
        '',
        task.title,
        task.whyNeeded,
        '',
        `Action: ${task.recommendedAction}`,
      ].join('\n')
    );

    if (!ok) return;

    setBusyTaskId(task.taskId);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/google-ads/operator-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.taskId, clientId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to approve task');
      }

      setLocalApprovals((current) => [data.task, ...current.filter((item) => item.taskId !== data.task.taskId)]);
      setStatusMessage(data.message || 'Task approved.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to approve task');
    } finally {
      setBusyTaskId(null);
    }
  }

  if (!tasks.length && !localApprovals.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-[var(--muted)]">
        No operator tasks are ready right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--foreground)]">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 max-w-4xl">
        {tasks.map((task) => {
          const approved = approvedTaskIds.has(task.taskId);
          const busy = busyTaskId === task.taskId;

          return (
            <div key={task.taskId} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[var(--muted)] uppercase tracking-wide">
                  {task.source === 'alert' ? 'Needs review' : 'Proposed task'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${approved ? 'text-green-400 bg-green-500/15' : 'text-[var(--muted)] bg-white/5'}`}>
                  {approved ? 'Approved' : 'Approval gated'}
                </span>
              </div>

              <p className="text-sm font-semibold mb-1">{task.title}</p>
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-2">{task.whyNeeded}</p>
              <p className="text-xs text-[var(--foreground)]/80 leading-relaxed mb-4">{task.recommendedAction}</p>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[10px] text-[var(--muted)]">
                  Risk: {task.risk}
                </span>
                <button
                  type="button"
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
                  onClick={() => approveTask(task)}
                  disabled={busy || approved}
                >
                  {busy ? 'Approving…' : approved ? 'Approved' : 'Approve task'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {localApprovals.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold mb-3">Recently approved</p>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            {localApprovals.slice(0, 5).map((approval) => (
              <li key={`${approval.taskId}-${approval.approvedAt}`} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--foreground)]">{approval.title}</div>
                  <div>{approval.recommendedAction}</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-green-400 bg-green-500/15 flex-shrink-0">
                  {approval.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
