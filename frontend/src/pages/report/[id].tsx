import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AgentWorkflow, overallPercent } from '@/components/workflow/AgentWorkflow';
import { ActivityLog, ElapsedTimer, RunSummary, VerdictTally } from '@/components/workflow/RunPanel';
import { ReportView } from '@/components/report/ReportView';
import { Button } from '@/components/ui/Button';
import { ResearchTask, getTask, isFinished, startResearch } from '@/lib/api';
import { hostname } from '@/lib/report';

const POLL_MS = 2000;

function currentHeadline(task: ResearchTask) {
  const running = task.progress?.agents.find((a) => a.status === 'running' && a.id !== 'orchestrator');
  if (running) return `${running.name}: ${running.detail || running.role}`;
  return 'Waiting for the orchestrator to start…';
}

/** The live workflow canvas plus activity and stats, shown while a run is going and as a trace afterwards. */
function WorkflowPanel({ task }: { task: ResearchTask }) {
  const completed = task.status === 'COMPLETED';
  const failed = task.status === 'FAILED';
  const live = !isFinished(task.status);

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="relative">
          <AgentWorkflow progress={task.progress} completed={completed} failed={failed} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ActivityLog progress={task.progress} live={live} />
        <div className="space-y-4">
          {live && <RunSummary percent={overallPercent(task.progress, completed)} since={task.created_at} headline={currentHeadline(task)} />}
          <VerdictTally progress={task.progress} />
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : null;
  const [task, setTask] = useState<ResearchTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    setTask(null);
    setError(null);
    setShowWorkflow(false);

    const poll = async () => {
      try {
        const next = await getTask(id);
        if (cancelled) return;
        setTask(next);
        setError(null);
        if (!isFinished(next.status)) timer = setTimeout(poll, POLL_MS);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message);
        // A missing report won't appear later; a network blip might recover
        if (err.message !== 'Report not found') timer = setTimeout(poll, POLL_MS * 2);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  const retry = async () => {
    if (!task) return;
    setRetrying(true);
    try {
      const next = await startResearch(task.url);
      router.push(`/report/${next.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  };

  if (!task) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
          {error ? (
            <>
              <AlertTriangle className="h-8 w-8 text-bad" />
              <p className="mt-4 font-medium text-fg">{error}</p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/"><ArrowLeft className="h-4 w-4" /> Back home</Link>
              </Button>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-subtle" />
          )}
        </div>
      </AppShell>
    );
  }

  if (task.status === 'COMPLETED' && task.document) {
    return (
      <AppShell>
        {showWorkflow && (
          <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Workflow trace</p>
                <p className="mt-1 text-sm text-muted">
                  How the agents produced this report · took <ElapsedTimer since={task.created_at} until={task.updated_at} />
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowWorkflow(false)} aria-label="Hide workflow">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <WorkflowPanel task={task} />
          </div>
        )}
        <ReportView task={task} onShowWorkflow={() => setShowWorkflow((s) => !s)} />
      </AppShell>
    );
  }

  const failed = task.status === 'FAILED';
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 animate-fade-up">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">{failed ? 'Run failed' : 'Agents at work'}</p>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              {failed ? 'Research could not finish' : `Researching ${hostname(task.url)}`}
            </h1>
            <a href={task.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-muted hover:text-accent">
              <span className="truncate">{task.url}</span> <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
          {failed && (
            <Button onClick={retry} disabled={retrying}>
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Try again
            </Button>
          )}
        </div>

        {failed && (
          <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-bad/30 bg-bad/8 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
            <div>
              <p className="text-sm font-semibold text-fg">{task.error_message || 'Research process failed'}</p>
              <p className="mt-1 text-sm text-muted">The workflow below shows where it stopped.</p>
            </div>
          </div>
        )}
        {error && !failed && (
          <p className="mb-4 text-sm text-warn">Connection problem: {error}. Retrying…</p>
        )}

        <WorkflowPanel task={task} />
      </div>
    </AppShell>
  );
}
