import React, { useEffect, useRef, useState } from 'react';
import { Activity, Timer } from 'lucide-react';
import { Progress, VERDICTS, VERDICT_ORDER } from '@/lib/report';
import { formatDuration, cn } from '@/lib/utils';

export const ElapsedTimer: React.FC<{ since: string; until?: string | null }> = ({ since, until }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  const end = until ? new Date(until).getTime() : now;
  return <span className="tabular-nums">{formatDuration((end - new Date(since).getTime()) / 1000)}</span>;
};

export const ActivityLog: React.FC<{ progress: Progress | null; live: boolean }> = ({ progress, live }) => {
  const log = progress?.log ?? [];
  const scroller = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Activity className="h-4 w-4 text-accent" /> Activity
        </p>
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok animate-ping-soft" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            Live
          </span>
        )}
      </div>
      <ol ref={scroller} className="max-h-72 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
        {log.length === 0 && <li className="text-subtle">Waiting for the first agent…</li>}
        {log.map((entry, i) => (
          <li key={`${entry.time}-${i}`} className={cn('flex gap-3 py-0.5 animate-fade-up', i < log.length - 1 && 'opacity-70')}>
            <span className="shrink-0 text-subtle">{entry.time.slice(11)}</span>
            <span className="min-w-0">
              <span className="text-accent">{entry.agent}</span>{' '}
              <span className="text-fg">{entry.message}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const VerdictTally: React.FC<{ progress: Progress | null }> = ({ progress }) => {
  const claims = progress?.claims ?? [];
  const finished = claims.filter((c) => c.status === 'done' && c.verdict);

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-fg mb-1">Verdicts so far</p>
      <p className="text-xs text-muted mb-4">
        {claims.length ? `${finished.length} of ${claims.length} claims decided` : 'Claims appear once the page is read'}
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {VERDICT_ORDER.map((v) => {
          const count = finished.filter((c) => c.verdict === v).length;
          return count ? (
            <div key={v} className="h-full transition-all duration-500" style={{ width: `${(count / claims.length) * 100}%`, background: VERDICTS[v].color }} />
          ) : null;
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {VERDICT_ORDER.map((v) => (
          <li key={v} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: VERDICTS[v].color }} />
            {VERDICTS[v].label}
            <span className="ml-auto font-semibold tabular-nums text-fg">
              {finished.filter((c) => c.verdict === v).length}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const RunSummary: React.FC<{ percent: number; since: string; headline: string }> = ({ percent, since, headline }) => (
  <div className="card p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-fg">Progress</p>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Timer className="h-3.5 w-3.5" /> <ElapsedTimer since={since} />
      </span>
    </div>
    <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-fg">{percent}%</p>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${percent}%` }} />
    </div>
    <p className="mt-3 line-clamp-2 text-xs text-muted">{headline}</p>
    <p className="mt-1 text-[11px] text-subtle">Usually takes 2–4 minutes. You can leave this page and come back.</p>
  </div>
);
