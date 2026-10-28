import React, { useCallback, useMemo, useState } from 'react';
import {
  Download, ExternalLink, Link2, Check, Sparkles, Workflow, AlertTriangle,
  ListChecks, BookOpen, LayoutGrid, Library,
} from 'lucide-react';
import { ResearchTask, downloadUrl } from '@/lib/api';
import { ClaimCheck, Verdict, VERDICTS, VERDICT_ORDER, hostname } from '@/lib/report';
import { ScoreGauge, VerdictDonut } from './Charts';
import { Markdown } from './Markdown';
import { ClaimCard, VerdictPill } from './ClaimCard';
import { SourcesList } from './SourcesList';
import { ChatDrawer } from './ChatDrawer';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'claims' | 'sources' | 'analysis';

const NEEDS_ATTENTION: Verdict[] = ['contradicted', 'partially_true', 'outdated'];

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <section className={cn('card p-5 sm:p-6', className)}>
    <h2 className="mb-3 text-[15px] font-semibold text-fg">{title}</h2>
    {children}
  </section>
);

const CopyLink: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; nothing useful to show
    }
  };
  return (
    <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link to this report" title={copied ? 'Copied' : 'Copy link'}>
      {copied ? <Check className="h-4 w-4 text-ok" /> : <Link2 className="h-4 w-4" />}
    </Button>
  );
};

const ScoreCard: React.FC<{ task: ResearchTask }> = ({ task }) => {
  const doc = task.document!;
  if (!doc.claims.length) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-fg">Summary report</p>
        <p className="mt-1 text-sm text-muted">This report was created before fact-checking was added, so it has no verdicts.</p>
      </div>
    );
  }
  return (
    <div className="card p-5">
      <p className="eyebrow">Credibility</p>
      <div className="mt-2 flex justify-center text-fg">
        <ScoreGauge score={doc.credibility_score} size={210} textColor="currentColor" />
      </div>
      <p className="text-center text-xs text-muted">
        Confidence-weighted share of checkable claims that held up
      </p>
      <div className="mt-5 flex items-center gap-4 border-t border-line pt-5 text-fg">
        <VerdictDonut claims={doc.claims} size={96} textColor="currentColor" />
        <ul className="flex-1 space-y-1.5 text-xs">
          {VERDICT_ORDER.map((v) => {
            const count = doc.claims.filter((c) => c.verdict === v).length;
            return count ? (
              <li key={v} className="flex items-center gap-2 text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: VERDICTS[v].color }} />
                {VERDICTS[v].label}
                <span className="ml-auto font-semibold tabular-nums text-fg">{count}</span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    </div>
  );
};

const Overview: React.FC<{ task: ResearchTask; onOpenClaims: (verdict: Verdict | 'all') => void }> = ({ task, onOpenClaims }) => {
  const doc = task.document!;
  const flagged = doc.claims.filter((c) => NEEDS_ATTENTION.includes(c.verdict));

  return (
    <div className="space-y-5">
      {doc.verdict_summary && (
        <section className="rounded-2xl border border-accent/25 bg-accent-soft p-5 sm:p-6">
          <p className="eyebrow !text-accent">Verdict</p>
          <p className="mt-2 text-[15px] leading-relaxed text-fg">{doc.verdict_summary}</p>
        </section>
      )}

      {flagged.length > 0 && (
        <Section title={`Needs attention · ${flagged.length}`}>
          <ul className="space-y-2">
            {flagged.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onOpenClaims(c.verdict)}
                  className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-line-strong hover:bg-surface-2/50"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: VERDICTS[c.verdict].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">{c.claim}</span>
                    {c.correction && <span className="mt-1 block text-xs text-muted">Correct: {c.correction}</span>}
                  </span>
                  <VerdictPill verdict={c.verdict} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Executive summary">
        <p className="text-[15px] leading-relaxed text-muted">{doc.summary}</p>
      </Section>

      <Section title="Key insights">
        <ol className="space-y-3">
          {doc.insights.map((insight, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-fg">{i + 1}</span>
              {insight}
            </li>
          ))}
        </ol>
      </Section>

      {doc.timeline.length > 0 && (
        <Section title="Timeline">
          <ol className="relative ml-1.5 border-l border-line">
            {doc.timeline.map((t, i) => (
              <li key={i} className="relative pb-5 pl-6 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
                <p className="text-xs font-semibold text-accent">{t.date}</p>
                <p className="mt-0.5 text-sm text-muted">{t.event}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
};

const ClaimsTab: React.FC<{ claims: ClaimCheck[]; sources: Map<number, any>; filter: Verdict | 'all'; setFilter: (v: Verdict | 'all') => void }> = ({
  claims,
  sources,
  filter,
  setFilter,
}) => {
  const shown = filter === 'all' ? claims : claims.filter((c) => c.verdict === filter);
  const options: (Verdict | 'all')[] = ['all', ...VERDICT_ORDER.filter((v) => claims.some((c) => c.verdict === v))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((v) => {
          const count = v === 'all' ? claims.length : claims.filter((c) => c.verdict === v).length;
          const active = filter === v;
          return (
            <button
              key={v}
              onClick={() => setFilter(v)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-muted hover:text-fg hover:border-line-strong'
              )}
            >
              {v !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: VERDICTS[v].color }} />}
              {v === 'all' ? 'All' : VERDICTS[v].label}
              <span className="tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      {shown.map((claim) => (
        <ClaimCard key={`${filter}-${claim.id}`} claim={claim} sources={sources} defaultOpen={claim.verdict !== 'supported'} />
      ))}
    </div>
  );
};

const Analysis: React.FC<{ task: ResearchTask }> = ({ task }) => {
  const doc = task.document!;
  return (
    <div className="space-y-5">
      <Section title="Extracted content">
        <Markdown text={doc.content} className="text-sm leading-relaxed text-muted" headingClassName="mt-5 mb-1.5 text-sm font-semibold text-fg first:mt-0" />
      </Section>
      <Section title="Extended validation">
        <p className="text-sm leading-relaxed text-muted">{doc.validation}</p>
      </Section>
      <Section title="Risks & limitations">
        <p className="text-sm leading-relaxed text-muted">{doc.risks}</p>
      </Section>
      <Section title="Comparison">
        <p className="text-sm leading-relaxed text-muted">{doc.comparison}</p>
      </Section>
    </div>
  );
};

export const ReportView: React.FC<{ task: ResearchTask; onShowWorkflow: () => void }> = ({ task, onShowWorkflow }) => {
  const doc = task.document!;
  const hasChecks = doc.claims.length > 0;
  const [tab, setTab] = useState<Tab>('overview');
  const [claimFilter, setClaimFilter] = useState<Verdict | 'all'>('all');
  const [chatOpen, setChatOpen] = useState(false);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const sources = useMemo(() => new Map(doc.sources.map((s) => [s.id, s])), [doc.sources]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, show: true },
    { id: 'claims', label: 'Fact-checks', icon: ListChecks, count: doc.claims.length, show: hasChecks },
    { id: 'sources', label: 'Sources', icon: Library, count: doc.sources.length, show: doc.sources.length > 0 },
    { id: 'analysis', label: 'Full analysis', icon: BookOpen, show: true },
  ];

  const openClaims = (verdict: Verdict | 'all') => {
    setClaimFilter(verdict);
    setTab('claims');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{hasChecks ? 'Fact-check report' : 'Research report'}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{doc.title || hostname(task.url)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <a href={task.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent">
              {hostname(task.url)} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <span>{new Date(task.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            {hasChecks && <span>{doc.claims.length} claims · {doc.sources.length} sources</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="md" onClick={onShowWorkflow}>
            <Workflow className="h-4 w-4" /> Workflow
          </Button>
          <CopyLink />
          <Button variant="outline" onClick={() => setChatOpen(true)}>
            <Sparkles className="h-4 w-4 text-accent" /> Ask AI
          </Button>
          <Button asChild>
            <a href={downloadUrl(task.id)}>
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-30 -mx-4 mt-8 border-b border-line bg-bg/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 surface-transition">
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm font-medium transition-colors',
                tab === t.id ? 'text-fg' : 'text-muted hover:text-fg'
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] tabular-nums text-muted">{t.count}</span>
              )}
              {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div key={tab} className="min-w-0 animate-fade-up">
          {tab === 'overview' && <Overview task={task} onOpenClaims={openClaims} />}
          {tab === 'claims' && <ClaimsTab claims={doc.claims} sources={sources} filter={claimFilter} setFilter={setClaimFilter} />}
          {tab === 'sources' && <SourcesList sources={doc.sources} />}
          {tab === 'analysis' && <Analysis task={task} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <ScoreCard task={task} />
          <button
            onClick={() => setChatOpen(true)}
            className="card group flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-fg">Ask about this report</span>
              <span className="block text-xs text-muted">Follow-up questions, answered with citations</span>
            </span>
          </button>
        </aside>
      </div>

      <ChatDrawer taskId={task.id} title={doc.title || hostname(task.url)} open={chatOpen} onClose={closeChat} />
    </div>
  );
};
