import React from 'react';
import {
  BrainCircuit, FileSearch, ShieldCheck, Library, PenLine, FileText,
  Check, X, Loader2, Clock,
} from 'lucide-react';
import { AgentState, ClaimProgress, Progress, VERDICTS } from '@/lib/report';
import { cn } from '@/lib/utils';

type NodeStatus = AgentState['status'];
type EdgeState = 'idle' | 'active' | 'done';

const NODES = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'Plans the run', icon: BrainCircuit },
  { id: 'analyst', name: 'Page Analyst', role: 'Reads the page, extracts claims', icon: FileSearch },
  { id: 'fact_checker', name: 'Fact Checkers', role: 'Verify each claim on the web', icon: ShieldCheck },
  { id: 'curator', name: 'Source Curator', role: 'Rates and checks sources', icon: Library },
  { id: 'builder', name: 'Report Builder', role: 'Writes the report', icon: PenLine },
  { id: 'pdf', name: 'PDF Report', role: 'Charts, verdicts, sources', icon: FileText },
] as const;

const AGENT_WEIGHTS: Record<string, number> = { analyst: 30, fact_checker: 40, curator: 5, builder: 25 };

/** Overall completion, weighting each agent by roughly how long it takes. */
export function overallPercent(progress: Progress | null, completed: boolean) {
  if (completed) return 100;
  if (!progress) return 0;
  const total = progress.agents.reduce((sum, agent) => {
    const weight = AGENT_WEIGHTS[agent.id] ?? 0;
    if (agent.status === 'done') return sum + weight;
    if (agent.status === 'running') return sum + weight * (agent.total ? agent.done / agent.total : 0.35);
    return sum;
  }, 0);
  return Math.min(99, Math.round(total));
}

interface WorkflowProps {
  progress: Progress | null;
  completed: boolean;
  failed: boolean;
  /** Static preview with no live data (used on the home page). */
  preview?: boolean;
}

function useNodeStates({ progress, completed, failed, preview }: WorkflowProps) {
  const agents = new Map((progress?.agents ?? []).map((a) => [a.id, a]));
  const status = (id: string): NodeStatus => {
    if (preview) return 'waiting';
    if (id === 'pdf') return completed ? 'done' : 'waiting';
    if (id === 'orchestrator' && !progress && !failed) return 'running'; // queued, about to start
    return agents.get(id)?.status ?? 'waiting';
  };
  const edgeInto = (id: string): EdgeState => {
    const s = status(id);
    if (s === 'done') return 'done';
    if (s === 'running') return 'active';
    if (id === 'pdf' && status('builder') === 'running') return 'active';
    return 'idle';
  };
  return { agents, status, edgeInto };
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  waiting: 'Waiting',
  running: 'Working',
  done: 'Done',
  failed: 'Failed',
};

const NodeIcon: React.FC<{ status: NodeStatus; Icon: React.ElementType }> = ({ status, Icon }) => (
  <span
    className={cn(
      'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
      status === 'running' && 'bg-accent text-accent-fg',
      status === 'done' && 'bg-ok/12 text-ok',
      status === 'failed' && 'bg-bad/12 text-bad',
      status === 'waiting' && 'bg-surface-2 text-subtle'
    )}
  >
    {status === 'running' && <span className="absolute inset-0 rounded-xl bg-accent animate-ping-soft" />}
    {status === 'done' ? <Check className="relative h-4 w-4" /> :
     status === 'failed' ? <X className="relative h-4 w-4" /> :
     <Icon className="relative h-4 w-4" />}
  </span>
);

const AgentNode: React.FC<{
  node: (typeof NODES)[number];
  status: NodeStatus;
  detail?: string;
  className?: string;
}> = ({ node, status, detail, className }) => (
  <div
    className={cn(
      'rounded-2xl border bg-surface p-3.5 transition-all duration-300',
      status === 'running' ? 'border-accent ring-4 ring-accent-soft shadow-card' : 'border-line',
      status === 'failed' && 'border-bad ring-4 ring-bad/10',
      status === 'waiting' && 'wf-dim',
      className
    )}
  >
    <div className="flex items-center gap-2.5">
      <NodeIcon status={status} Icon={node.icon} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-fg">{node.name}</p>
        <p className={cn(
          'text-[10px] font-semibold uppercase tracking-wider',
          status === 'running' ? 'text-accent' : status === 'done' ? 'text-ok' : status === 'failed' ? 'text-bad' : 'text-subtle'
        )}>
          {STATUS_LABEL[status]}
        </p>
      </div>
    </div>
    <p className="mt-2.5 line-clamp-2 min-h-[2.5em] text-[11.5px] leading-snug text-muted">
      {detail || node.role}
    </p>
  </div>
);

/* ---------- Edges ---------- */

const HEdge: React.FC<{ state: EdgeState; className?: string }> = ({ state, className }) => (
  <div className={cn('h-0.5 rounded-full', state === 'active' ? 'edge-active' : state === 'done' ? 'edge-done' : 'edge', className)} />
);

const VEdge: React.FC<{ state: EdgeState; className?: string }> = ({ state, className }) => (
  <div className={cn('w-0.5 rounded-full', state === 'active' ? 'edge-active-y' : state === 'done' ? 'edge-done' : 'edge', className)} />
);

/* ---------- Fact-check fan-out ---------- */

const claimEdge = (claim: ClaimProgress | null): EdgeState =>
  !claim ? 'idle' : claim.status === 'checking' ? 'active' : claim.status === 'done' ? 'done' : 'idle';

const ClaimChip: React.FC<{ claim: ClaimProgress | null; index: number }> = ({ claim, index }) => {
  if (!claim) {
    return (
      <div className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-dashed border-line px-2.5 text-[11px] text-subtle">
        <span className="font-mono">C{index}</span>
        <span className="h-1.5 flex-1 rounded-full bg-surface-2" />
      </div>
    );
  }
  const verdict = claim.verdict ? VERDICTS[claim.verdict] : null;
  return (
    <div
      title={claim.claim}
      className={cn(
        'flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-surface px-2.5 text-[11px] transition-colors duration-300',
        claim.status === 'checking' ? 'border-accent ring-2 ring-accent-soft' : 'border-line',
        claim.status === 'queued' && 'opacity-60'
      )}
      style={verdict ? { borderLeft: `3px solid ${verdict.color}` } : undefined}
    >
      <span className="font-mono text-subtle">C{claim.id}</span>
      {claim.status === 'queued' && <Clock className="h-3 w-3 shrink-0 text-subtle" />}
      {claim.status === 'checking' && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-accent" />}
      <span className="min-w-0 flex-1 truncate text-muted">{claim.claim}</span>
      {verdict && (
        <span className="shrink-0 font-semibold" style={{ color: verdict.color }}>
          {verdict.label}
        </span>
      )}
    </div>
  );
};

function claimSlots(claims: ClaimProgress[]): (ClaimProgress | null)[] {
  // Before the analyst finishes, show placeholders so the fan-out shape is visible
  return claims.length ? claims : [null, null, null];
}

const FanOut: React.FC<{ claims: ClaimProgress[]; inState: EdgeState; outState: EdgeState }> = ({
  claims,
  inState,
  outState,
}) => {
  const slots = claimSlots(claims);
  const many = slots.length > 1;
  return (
    <div className="relative flex w-[260px] shrink-0 flex-col gap-2">
      {/* Vertical bars join the stubs; rows are 36px tall so the bars run between row centres */}
      {many && <VEdge state={inState === 'idle' ? 'idle' : 'done'} className="absolute left-0 top-[18px] bottom-[18px]" />}
      {many && <VEdge state={outState} className="absolute right-0 top-[18px] bottom-[18px]" />}
      {slots.map((claim, i) => (
        <div key={claim?.id ?? `slot-${i}`} className="flex items-center">
          <HEdge state={claimEdge(claim)} className="w-3 shrink-0" />
          <ClaimChip claim={claim} index={i + 1} />
          <HEdge state={claim?.status === 'done' ? 'done' : 'idle'} className="w-3 shrink-0" />
        </div>
      ))}
    </div>
  );
};

/* ---------- Layouts ---------- */

export const AgentWorkflow: React.FC<WorkflowProps> = (props) => {
  const { progress } = props;
  const { agents, status, edgeInto } = useNodeStates(props);
  const claims = progress?.claims ?? [];
  const checker = agents.get('fact_checker');
  const detail = (id: string) => (props.preview ? undefined : agents.get(id)?.detail);
  const node = (id: string) => NODES.find((n) => n.id === id)!;
  const doneClaims = claims.filter((c) => c.status === 'done').length;
  const fanOutState: EdgeState = doneClaims === 0 ? 'idle' : status('curator') === 'waiting' ? 'active' : 'done';

  return (
    <div data-preview={props.preview ? '' : undefined}>
      {/* Desktop: left-to-right pipeline */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="mx-auto flex min-w-[1080px] items-center justify-center px-2 py-4">
          <AgentNode node={node('orchestrator')} status={status('orchestrator')} detail={detail('orchestrator')} className="w-[150px]" />
          <HEdge state={edgeInto('analyst')} className="w-7 shrink-0" />
          <AgentNode node={node('analyst')} status={status('analyst')} detail={detail('analyst')} className="w-[150px]" />
          <HEdge state={edgeInto('fact_checker')} className="w-5 shrink-0" />

          <div className="flex flex-col items-center">
            <div className="mb-2 flex items-center gap-2 text-[11px]">
              <NodeIcon status={status('fact_checker')} Icon={ShieldCheck} />
              <div>
                <p className="text-[13px] font-semibold text-fg">Fact Checkers</p>
                <p className="text-muted">
                  {props.preview ? 'One agent per claim, in parallel' :
                   claims.length ? `${doneClaims} of ${claims.length} checked` : 'Waiting for claims'}
                </p>
              </div>
            </div>
            <FanOut claims={props.preview ? [] : claims} inState={edgeInto('fact_checker')} outState={fanOutState} />
          </div>

          <HEdge state={edgeInto('curator')} className="w-5 shrink-0" />
          <AgentNode node={node('curator')} status={status('curator')} detail={detail('curator')} className="w-[150px]" />
          <HEdge state={edgeInto('builder')} className="w-7 shrink-0" />
          <AgentNode node={node('builder')} status={status('builder')} detail={detail('builder')} className="w-[150px]" />
          <HEdge state={edgeInto('pdf')} className="w-7 shrink-0" />
          <AgentNode node={node('pdf')} status={status('pdf')} className="w-[140px]" />
        </div>
      </div>

      {/* Mobile: top-to-bottom pipeline */}
      <ol className="lg:hidden">
        {NODES.map((n, i) => (
          <li key={n.id}>
            {i > 0 && <VEdge state={edgeInto(n.id)} className="ml-[34px] h-5" />}
            {n.id === 'fact_checker' ? (
              <div className={cn('rounded-2xl border bg-surface p-3.5', status(n.id) === 'running' ? 'border-accent ring-4 ring-accent-soft' : 'border-line', status(n.id) === 'waiting' && 'wf-dim')}>
                <div className="flex items-center gap-2.5 mb-3">
                  <NodeIcon status={status(n.id)} Icon={n.icon} />
                  <div>
                    <p className="text-[13px] font-semibold text-fg">{n.name}</p>
                    <p className="text-[11px] text-muted">
                      {claims.length ? `${doneClaims} of ${claims.length} checked` : checker?.detail || n.role}
                    </p>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  {claimSlots(props.preview ? [] : claims).map((claim, ci) => (
                    <ClaimChip key={claim?.id ?? `slot-${ci}`} claim={claim} index={ci + 1} />
                  ))}
                </div>
              </div>
            ) : (
              <AgentNode node={n} status={status(n.id)} detail={detail(n.id)} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
