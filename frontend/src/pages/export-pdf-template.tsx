import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ResearchDocument, VERDICTS, CREDIBILITY_COLORS, LINK_STATUS, hostname } from '@/lib/report';
import { ScoreGauge, VerdictDonut, VerdictLegend } from '@/components/report/Charts';
import { Markdown } from '@/components/report/Markdown';

const STANCE_COLORS = { supports: '#10b981', contradicts: '#ef4444', context: '#a1a1aa' };
const MAX_MAP_SOURCES = 12;

export default function ExportPdfTemplate() {
  const router = useRouter();
  const { task_id } = router.query;
  const [data, setData] = useState<ResearchDocument | null>(null);

  useEffect(() => {
    if (task_id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/status/${task_id}`)
        .then(res => res.json())
        .then(json => setData(json.document));
    }
  }, [task_id]);

  if (!data) return <div className="p-8 text-center">Loading research data...</div>;

  const claims = data.claims || [];
  const sources = data.sources || [];
  const timeline = data.timeline || [];
  const recommended = sources.filter(s => s.recommended);
  const mapSources = sources.slice(0, MAX_MAP_SOURCES);
  const sourceById = new Map(sources.map(s => [s.id, s]));

  let n = 0;
  const heading = (title: string) => (
    <h2 className="text-2xl font-bold text-blue-800 mb-4">{++n}. {title}</h2>
  );

  return (
    <div data-ready="true" className="max-w-4xl mx-auto px-12 py-4 bg-white text-gray-900 font-serif leading-relaxed">
      <header className="border-b-4 border-blue-600 pb-4 mb-8">
        <p className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-blue-600 mb-2">
          {claims.length ? 'Research & Fact-Check Report' : 'Research Analysis Report'}
        </p>
        <h1 className="text-4xl font-bold leading-tight">{data.title || 'Research Analysis Report'}</h1>
        {data.source_url && (
          <p className="text-sm font-sans text-gray-500 mt-3">
            Source: <a href={data.source_url} className="text-blue-700 underline">{data.source_url}</a>
            {' · '}Generated {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
        )}
      </header>

      <section className="mb-8">
        {heading('Executive Summary')}
        <p className="text-lg">{data.summary}</p>
      </section>

      {claims.length > 0 && (
        <section className="mb-8 avoid-break">
          {heading('Credibility Overview')}
          <div className="flex items-center justify-around gap-6 rounded-xl border border-gray-200 bg-gray-50 p-6 font-sans">
            <div className="text-center">
              <ScoreGauge score={data.credibility_score} size={210} textColor="#111827" />
              <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Credibility score</p>
            </div>
            <div className="flex items-center gap-5">
              <VerdictDonut claims={claims} size={140} textColor="#111827" />
              <VerdictLegend claims={claims} className="space-y-1.5 text-sm text-gray-700" />
            </div>
          </div>
          {data.verdict_summary && <p className="text-lg mt-5">{data.verdict_summary}</p>}
        </section>
      )}

      <section className="mb-8">
        {heading('Key Insights')}
        <ul className="list-disc pl-6 space-y-2">
          {data.insights.map((insight, i) => (
            <li key={i} className="text-lg">{insight}</li>
          ))}
        </ul>
      </section>

      {claims.length > 0 && (
        <section className="mb-8">
          {heading('Fact-Check Results')}
          <div className="space-y-4">
            {claims.map(claim => {
              const verdict = VERDICTS[claim.verdict];
              return (
                <div key={claim.id} className="avoid-break rounded-lg border border-gray-200 p-5" style={{ borderLeft: `6px solid ${verdict.color}` }}>
                  <div className="flex items-center justify-between font-sans mb-2">
                    <span className="text-xs font-bold text-gray-400">CLAIM {claim.id}</span>
                    <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 text-white" style={{ background: verdict.color }}>
                      {verdict.label} · {claim.confidence}%
                    </span>
                  </div>
                  <p className="text-lg font-semibold mb-2">{claim.claim}</p>
                  {claim.quote && <p className="text-sm italic text-gray-500 mb-2">Page says: “{claim.quote}”</p>}
                  <p className="text-base">{claim.explanation}</p>
                  {claim.correction && (
                    <p className="text-base mt-2 rounded bg-amber-50 border border-amber-200 px-3 py-2">
                      <strong>Correct information:</strong> {claim.correction}
                    </p>
                  )}
                  {claim.evidence.length > 0 && (
                    <ul className="mt-3 space-y-1 font-sans text-xs text-gray-600">
                      {claim.evidence.map((e, i) => {
                        const source = e.source_id ? sourceById.get(e.source_id) : undefined;
                        return (
                          <li key={i}>
                            <span className="font-bold" style={{ color: STANCE_COLORS[e.stance] }}>
                              [{e.source_id ?? '?'}] {e.stance}
                            </span>{' '}
                            “{e.quote}” —{' '}
                            <a href={e.url} className="text-blue-700 underline">{source?.domain || hostname(e.url)}</a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {claims.length > 0 && mapSources.length > 0 && (
        <section className="mb-8 avoid-break">
          {heading('Claim–Source Map')}
          <p className="text-sm text-gray-600 mb-3">
            Which sources were used to judge each claim, and whether they backed it up.
            {sources.length > mapSources.length && ` Showing the ${mapSources.length} most credible of ${sources.length} sources; all are listed under Sources & References.`}
          </p>
          <table className="w-full border-collapse font-sans text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 border-b border-gray-300">Claim</th>
                {mapSources.map(s => (
                  <th key={s.id} className="p-1 border-b border-gray-300 text-center" title={s.domain}>
                    <div>S{s.id}</div>
                    <div className="font-normal text-[9px] text-gray-400 truncate max-w-[60px]">{s.domain}</div>
                  </th>
                ))}
                <th className="p-2 border-b border-gray-300">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr key={claim.id} className="border-b border-gray-100">
                  <td className="p-2 max-w-[220px]">C{claim.id}. {claim.claim.length > 70 ? claim.claim.slice(0, 70) + '…' : claim.claim}</td>
                  {mapSources.map(s => {
                    const e = claim.evidence.find(ev => ev.source_id === s.id);
                    return (
                      <td key={s.id} className="text-center p-1">
                        {e && <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: STANCE_COLORS[e.stance] }} />}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-bold" style={{ color: VERDICTS[claim.verdict].color }}>
                    {VERDICTS[claim.verdict].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-5 mt-3 font-sans text-xs text-gray-600">
            {Object.entries(STANCE_COLORS).map(([stance, color]) => (
              <span key={stance} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {stance}
              </span>
            ))}
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="mb-8 avoid-break">
          {heading('Timeline')}
          <ol className="relative border-l-2 border-blue-200 ml-3">
            {timeline.map((t, i) => (
              <li key={i} className="ml-6 mb-4">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-blue-600" />
                <p className="font-sans text-sm font-bold text-blue-800">{t.date}</p>
                <p className="text-base">{t.event}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mb-8">
        {heading('Extracted Content')}
        <Markdown text={data.content} className="text-gray-700" headingClassName="text-lg font-bold text-gray-900 mt-5 mb-1" />
      </section>

      <section className="mb-8">
        {heading('Extended Validation')}
        <p className="text-lg">{data.validation}</p>
      </section>

      <section className="mb-8">
        {heading('Risks & Limitations')}
        <p className="text-lg">{data.risks}</p>
      </section>

      <section className="mb-8">
        {heading('Comparison')}
        <p className="text-lg">{data.comparison}</p>
      </section>

      {sources.length > 0 && (
        <section className="mb-8">
          {heading('Sources & References')}
          {recommended.length > 0 && (
            <div className="avoid-break rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-5">
              <p className="font-sans text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">Recommended reading</p>
              <ul className="space-y-1">
                {recommended.map(s => (
                  <li key={s.id} className="text-sm">
                    <a href={s.url} className="text-blue-700 underline">{s.title}</a>
                    <span className="text-gray-500"> — {s.domain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ol className="space-y-3 font-sans text-sm">
            {sources.map(s => (
              <li key={s.id} className="avoid-break flex gap-3">
                <span className="font-bold text-gray-400 w-8 shrink-0">[{s.id}]</span>
                <div>
                  <a href={s.url} className="text-blue-700 underline font-semibold">{s.title}</a>
                  <div className="text-xs text-gray-500 break-all">{s.url}</div>
                  <div className="flex gap-3 text-xs mt-0.5">
                    <span style={{ color: CREDIBILITY_COLORS[s.credibility] }} className="font-bold uppercase">
                      {s.credibility} credibility
                    </span>
                    <span style={{ color: LINK_STATUS[s.link_status].color }}>
                      {LINK_STATUS[s.link_status].label}
                    </span>
                    <span className="text-gray-500">Used for claim {s.claim_ids.join(', ')}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <style jsx global>{`
        html, body {
          background: #ffffff !important;
          color: #111827;
          height: auto !important;
          min-height: 0 !important;
        }
        /* Trailing margin on the last section otherwise spills onto an empty final page */
        section:last-of-type {
          margin-bottom: 0 !important;
        }
        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `}</style>
    </div>
  );
}
