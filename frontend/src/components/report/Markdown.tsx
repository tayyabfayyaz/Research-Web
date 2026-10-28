import React from 'react';

/** Renders the small markdown subset the agents produce: ### headings, - bullets, **bold**. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

export const Markdown: React.FC<{ text: string; headingClassName?: string; className?: string }> = ({
  text,
  headingClassName = 'font-bold mt-4 mb-1',
  className,
}) => {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1 my-2">
          {bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };

  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushBullets();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    blocks.push(
      heading
        ? <h4 key={blocks.length} className={headingClassName}>{inline(heading[1])}</h4>
        : <p key={blocks.length} className="my-2">{inline(line)}</p>
    );
  }
  flushBullets();

  return <div className={className}>{blocks}</div>;
};
