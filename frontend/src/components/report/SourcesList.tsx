import React, { useState } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { CREDIBILITY_COLORS, LINK_STATUS, Source } from '@/lib/report';
import { cn } from '@/lib/utils';

const FILTERS = ['all', 'high', 'medium', 'low'] as const;

const SourceRow: React.FC<{ source: Source }> = ({ source }) => (
  <li className="flex gap-3 py-3.5">
    <span className="mt-0.5 w-7 shrink-0 font-mono text-xs text-subtle">[{source.id}]</span>
    <div className="min-w-0 flex-1">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-start gap-1.5 text-sm font-medium text-fg hover:text-accent"
      >
        <span className="line-clamp-2">{source.title}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-muted">{source.domain}</span>
        <span className="font-semibold capitalize" style={{ color: CREDIBILITY_COLORS[source.credibility] }}>
          {source.credibility} credibility
        </span>
        <span style={{ color: LINK_STATUS[source.link_status].color }}>{LINK_STATUS[source.link_status].label}</span>
        <span className="text-subtle">Claim {source.claim_ids.join(', ')}</span>
      </div>
    </div>
  </li>
);

export const SourcesList: React.FC<{ sources: Source[] }> = ({ sources }) => {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const recommended = sources.filter((s) => s.recommended);
  const shown = filter === 'all' ? sources : sources.filter((s) => s.credibility === filter);

  return (
    <div className="space-y-6">
      {recommended.length > 0 && (
        <section className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Star className="h-4 w-4 fill-warn text-warn" /> Recommended reading
          </p>
          <p className="mt-1 text-xs text-muted">Trustworthy sources with working links that confirm facts from this page.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {recommended.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full flex-col rounded-xl border border-line p-3 transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  <span className="line-clamp-2 text-sm font-medium text-fg">{s.title}</span>
                  <span className="mt-1 text-xs text-muted">{s.domain}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card px-5 pb-2 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <p className="text-sm font-semibold text-fg">All sources <span className="text-subtle font-normal">· {sources.length}</span></p>
          <div className="flex gap-1 rounded-lg bg-surface-2 p-0.5" role="tablist" aria-label="Filter by credibility">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  filter === f ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <ol className="divide-y divide-line">
          {shown.map((s) => <SourceRow key={s.id} source={s} />)}
          {shown.length === 0 && <li className="py-6 text-center text-sm text-muted">No {filter}-credibility sources.</li>}
        </ol>
      </section>
    </div>
  );
};
