export type Verdict = 'supported' | 'contradicted' | 'partially_true' | 'outdated' | 'unverifiable';

export interface Evidence {
  source_id?: number;
  url: string;
  quote: string;
  stance: 'supports' | 'contradicts' | 'context';
}

export interface ClaimCheck {
  id: number;
  claim: string;
  quote: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  correction: string;
  evidence: Evidence[];
}

export interface Source {
  id: number;
  title: string;
  url: string;
  domain: string;
  credibility: 'high' | 'medium' | 'low';
  link_status: 'live' | 'protected' | 'dead';
  claim_ids: number[];
  recommended: boolean;
}

export interface ResearchDocument {
  summary: string;
  insights: string[];
  content: string;
  validation: string;
  risks: string;
  comparison: string;
  title?: string | null;
  source_url?: string | null;
  verdict_summary?: string | null;
  credibility_score?: number | null;
  timeline: { date: string; event: string }[];
  claims: ClaimCheck[];
  sources: Source[];
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'waiting' | 'running' | 'done' | 'failed';
  detail: string;
  done: number;
  total: number;
}

export interface ClaimProgress {
  id: number;
  claim: string;
  status: 'queued' | 'checking' | 'done';
  verdict: Verdict | null;
  confidence: number | null;
}

export interface Progress {
  agents: AgentState[];
  log: { time: string; agent: string; message: string }[];
  claims?: ClaimProgress[];
}

export const VERDICTS: Record<Verdict, { label: string; color: string }> = {
  supported: { label: 'Supported', color: '#10b981' },
  partially_true: { label: 'Partly true', color: '#f59e0b' },
  outdated: { label: 'Outdated', color: '#0ea5e9' },
  contradicted: { label: 'Contradicted', color: '#ef4444' },
  unverifiable: { label: 'Unverifiable', color: '#71717a' },
};

export const VERDICT_ORDER: Verdict[] = ['supported', 'partially_true', 'outdated', 'contradicted', 'unverifiable'];

export const CREDIBILITY_COLORS: Record<Source['credibility'], string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
};

export function verdictCounts(claims: ClaimCheck[]) {
  return VERDICT_ORDER.map((verdict) => ({
    verdict,
    count: claims.filter((c) => c.verdict === verdict).length,
  })).filter((v) => v.count > 0);
}

export function scoreLabel(score: number | null | undefined) {
  if (score == null) return { label: 'Not enough evidence', color: '#71717a' };
  if (score >= 80) return { label: 'Highly reliable', color: '#10b981' };
  if (score >= 60) return { label: 'Mostly reliable', color: '#84cc16' };
  if (score >= 40) return { label: 'Mixed reliability', color: '#f59e0b' };
  return { label: 'Unreliable', color: '#ef4444' };
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const LINK_STATUS: Record<Source['link_status'], { label: string; color: string }> = {
  live: { label: 'Link verified', color: '#10b981' },
  protected: { label: 'Site blocks bots - opens in browser', color: '#f59e0b' },
  dead: { label: 'Link unreachable', color: '#ef4444' },
};
