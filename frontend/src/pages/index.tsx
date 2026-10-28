import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Globe, Loader2, AlertCircle, ShieldCheck, Library, FileText, XCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AgentWorkflow } from '@/components/workflow/AgentWorkflow';
import { Button } from '@/components/ui/Button';
import { ResearchTask, isFinished, listTasks, startResearch } from '@/lib/api';
import { VERDICTS, VERDICT_ORDER, hostname, scoreLabel } from '@/lib/report';
import { cn, timeAgo } from '@/lib/utils';

const EXAMPLES = [
  { label: 'Great Wall of China', url: 'https://en.wikipedia.org/wiki/Great_Wall_of_China' },
  { label: 'Portable Document Format', url: 'https://en.wikipedia.org/wiki/Portable_Document_Format' },
  { label: 'Moon landing', url: 'https://en.wikipedia.org/wiki/Moon_landing' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Every claim verified', text: 'Each factual claim is checked against independent sources, with a verdict and confidence.' },
  { icon: Library, title: 'Sources you can trust', text: 'Sources are de-duplicated, rated for credibility, and every link is tested.' },
  { icon: FileText, title: 'A report you can share', text: 'A PDF with charts, corrections and citations, plus follow-up Q&A.' },
];

const PAGE_SIZE = 9;

function ReportCard({ task }: { task: ResearchTask }) {
  const doc = task.document;
  const running = !isFinished(task.status);
  const failed = task.status === 'FAILED';
  const score = doc?.credibility_score;
  const { label, color } = scoreLabel(score);
  const claims = doc?.claims ?? [];

  return (
    <Link
      href={`/report/${task.id}`}
      className="card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-semibold uppercase text-muted">
          {hostname(task.url).charAt(0)}
        </span>
        {running && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
            <Loader2 className="h-3 w-3 animate-spin" /> In progress
          </span>
        )}
        {failed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bad/10 px-2.5 py-1 text-[11px] font-semibold text-bad">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        )}
        {task.status === 'COMPLETED' && claims.length > 0 && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color, background: `${color}1f` }}>
            {score ?? '–'} · {label}
          </span>
        )}
        {task.status === 'COMPLETED' && claims.length === 0 && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">Summary</span>
        )}
      </div>
      <p className="mt-4 line-clamp-2 font-medium text-fg group-hover:text-accent transition-colors">
        {doc?.title || hostname(task.url)}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{hostname(task.url)} · {timeAgo(task.created_at)}</p>
      {claims.length > 0 && (
        <div className="mt-auto pt-4">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
            {VERDICT_ORDER.map((v) => {
              const count = claims.filter((c) => c.verdict === v).length;
              return count ? <div key={v} style={{ width: `${(count / claims.length) * 100}%`, background: VERDICTS[v].color }} /> : null;
            })}
          </div>
          <p className="mt-2 text-[11px] text-subtle">{claims.length} claims checked · {doc!.sources.length} sources</p>
        </div>
      )}
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ResearchTask[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  const submit = async (target: string) => {
    let value = target.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    setUrl(value);
    setSubmitting(true);
    setError(null);
    try {
      const task = await startResearch(value);
      router.push(`/report/${task.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const visible = tasks ? (showAll ? tasks : tasks.slice(0, PAGE_SIZE)) : [];

  return (
    <AppShell showNewButton={false}>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Multi-agent research & fact-checking
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fg sm:text-6xl sm:leading-[1.05]">
            Is it true?<br />
            <span className="text-muted">Paste a link and find out.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            A team of AI agents reads the page, checks every claim against independent sources, and hands you a
            cited report.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(url);
            }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl border bg-surface p-2 shadow-card transition-all focus-within:ring-4 focus-within:ring-accent-soft',
                error ? 'border-bad' : 'border-line focus-within:border-accent'
              )}
            >
              <Globe className="ml-2 h-5 w-5 shrink-0 text-subtle" />
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                aria-label="Web page address"
                aria-invalid={!!error}
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                disabled={submitting}
                className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-fg placeholder:text-subtle focus:outline-none"
              />
              <Button type="submit" size="lg" disabled={submitting || !url.trim()} className="h-11">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                <span className="hidden sm:inline">{submitting ? 'Starting…' : 'Verify'}</span>
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-3 flex items-center justify-center gap-1.5 text-sm text-bad">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-subtle">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.url}
                onClick={() => submit(ex.url)}
                disabled={submitting}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-fg disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">A team of specialist agents, coordinated for you</h2>
          <p className="mt-2 text-muted">
            The orchestrator hands each job to a specialist. Fact checkers run in parallel — one per claim — and you
            can watch every step live.
          </p>
        </div>
        <div className="card relative overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
          <div className="relative">
            <AgentWorkflow progress={null} completed={false} failed={false} preview />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <f.icon className="h-4 w-4" />
              </span>
              <p className="mt-4 font-medium text-fg">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent reports */}
      <section id="reports" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Recent reports</h2>
          </div>
          {tasks && tasks.length > PAGE_SIZE && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${tasks.length}`}
            </Button>
          )}
        </div>

        {tasks === null && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse bg-surface-2/50" />
            ))}
          </div>
        )}
        {tasks?.length === 0 && (
          <div className="card flex flex-col items-center p-10 text-center">
            <p className="font-medium text-fg">No reports yet</p>
            <p className="mt-1 text-sm text-muted">Paste a link above to run your first fact-check.</p>
          </div>
        )}
        {visible.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((task) => <ReportCard key={task.id} task={task} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}
