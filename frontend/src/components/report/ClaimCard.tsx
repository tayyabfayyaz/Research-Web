import React, { useState } from 'react';
import { ChevronDown, ExternalLink, Lightbulb, Quote } from 'lucide-react';
import { ClaimCheck, Source, VERDICTS } from '@/lib/report';
import { cn } from '@/lib/utils';

const STANCE = {
  supports: { label: 'Supports', className: 'text-ok bg-ok/10' },
  contradicts: { label: 'Contradicts', className: 'text-bad bg-bad/10' },
  context: { label: 'Context', className: 'text-muted bg-surface-2' },
};

export const VerdictPill: React.FC<{ verdict: ClaimCheck['verdict']; confidence?: number; className?: string }> = ({
  verdict,
  confidence,
  className,
}) => {
  const meta = VERDICTS[verdict];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', className)}
      style={{ color: meta.color, background: `${meta.color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
      {confidence !== undefined && <span className="opacity-70 tabular-nums">· {confidence}%</span>}
    </span>
  );
};

export const ClaimCard: React.FC<{ claim: ClaimCheck; sources: Map<number, Source>; defaultOpen?: boolean }> = ({
  claim,
  sources,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const meta = VERDICTS[claim.verdict];

  return (
    <article className="card overflow-hidden" style={{ borderLeft: `3px solid ${meta.color}` }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2/50 sm:p-5"
      >
        <span className="mt-0.5 font-mono text-xs text-subtle">C{claim.id}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug text-fg">{claim.claim}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <VerdictPill verdict={claim.verdict} confidence={claim.confidence} />
            {claim.evidence.length > 0 && (
              <span className="text-xs text-subtle">{claim.evidence.length} evidence {claim.evidence.length === 1 ? 'quote' : 'quotes'}</span>
            )}
          </div>
        </div>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 pb-5 pt-4 sm:px-5 animate-fade-up">
          {claim.quote && (
            <p className="flex gap-2 text-sm italic text-muted">
              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {claim.quote}
            </p>
          )}
          <p className="text-sm leading-relaxed text-fg">{claim.explanation}</p>
          {claim.correction && (
            <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/8 p-3.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-warn">Correct information</p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{claim.correction}</p>
              </div>
            </div>
          )}
          {claim.evidence.length > 0 && (
            <ul className="space-y-2.5">
              {claim.evidence.map((e, i) => {
                const source = e.source_id ? sources.get(e.source_id) : undefined;
                return (
                  <li key={i} className="rounded-xl bg-surface-2/60 p-3 text-sm">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn('rounded-md px-1.5 py-0.5 font-semibold', STANCE[e.stance].className)}>
                        {STANCE[e.stance].label}
                      </span>
                      <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        [{e.source_id}] {source?.domain ?? 'source'} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-muted">“{e.quote}”</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </article>
  );
};
