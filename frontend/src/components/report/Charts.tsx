import React from 'react';
import { ClaimCheck, VERDICTS, scoreLabel, verdictCounts } from '@/lib/report';

/** Ring chart of how many claims landed in each verdict. */
export const VerdictDonut: React.FC<{ claims: ClaimCheck[]; size?: number; textColor?: string }> = ({
  claims,
  size = 160,
  textColor = 'currentColor',
}) => {
  const counts = verdictCounts(claims);
  const total = claims.length;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Verdict breakdown">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#a1a1aa" strokeOpacity="0.2" strokeWidth="12" />
      {counts.map(({ verdict, count }) => {
        const length = (count / total) * circumference;
        // Leave a hairline gap between segments so adjacent colors stay distinct
        const gap = counts.length > 1 ? 1.2 : 0;
        const segment = (
          <circle
            key={verdict}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={VERDICTS[verdict].color}
            strokeWidth="12"
            strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += length;
        return segment;
      })}
      <text x="50" y="48" textAnchor="middle" fontSize="20" fontWeight="800" fill={textColor}>
        {total}
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="8" fill={textColor} opacity="0.6">
        claims
      </text>
    </svg>
  );
};

/** Half-circle gauge for the 0-100 credibility score. */
export const ScoreGauge: React.FC<{ score: number | null | undefined; size?: number; textColor?: string }> = ({
  score,
  size = 200,
  textColor = 'currentColor',
}) => {
  const { label, color } = scoreLabel(score);
  const radius = 40;
  const arc = Math.PI * radius;
  const filled = score == null ? 0 : (score / 100) * arc;

  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" role="img" aria-label={`Credibility score ${score ?? 'n/a'}`}>
      <path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke="#a1a1aa" strokeOpacity="0.2" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M10 52 A40 40 0 0 1 90 52"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${arc}`}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="800" fill={textColor}>
        {score ?? '–'}
      </text>
      <text x="50" y="59" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={color}>
        {label.toUpperCase()}
      </text>
    </svg>
  );
};

export const VerdictLegend: React.FC<{ claims: ClaimCheck[]; className?: string }> = ({ claims, className }) => (
  <ul className={className}>
    {verdictCounts(claims).map(({ verdict, count }) => (
      <li key={verdict} className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: VERDICTS[verdict].color }} />
        <span>{VERDICTS[verdict].label}</span>
        <span className="opacity-60">{count}</span>
      </li>
    ))}
  </ul>
);
