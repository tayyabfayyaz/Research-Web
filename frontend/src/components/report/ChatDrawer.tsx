import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Loader2, Sparkles, X } from 'lucide-react';
import { askAboutReport } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Which claims were wrong, and what is correct?',
  'Which sources are the most trustworthy?',
  'What should I double-check myself?',
];

export const ChatDrawer: React.FC<{ taskId: string; title: string; open: boolean; onClose: () => void }> = ({
  taskId,
  title,
  open,
  onClose,
}) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTurns([]);
    setError(null);
  }, [taskId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Keep the report behind the drawer from scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    const list = bottomRef.current?.parentElement;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [turns, sending]);

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || sending) return;
    setInput('');
    setError(null);
    setSending(true);
    const history = turns;
    setTurns((t) => [...t, { role: 'user', content: message }]);
    try {
      const answer = await askAboutReport(taskId, message, history);
      setTurns((t) => [...t, { role: 'assistant', content: answer }]);
    } catch (err: any) {
      setError(err.message);
      setTurns(history);
      setInput(message);
    } finally {
      setSending(false);
    }
  };

  // Portal out of the page: an ancestor with a transform (the page fade-in) would otherwise trap position: fixed.
  // #app-root rather than <body> so the drawer keeps the app's font variables.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-up" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Ask about this report"
        className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl animate-slide-in"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Sparkles className="h-4 w-4 text-accent" /> Ask about this report
            </p>
            <p className="truncate text-xs text-muted">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {turns.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Answers come only from this report's findings and cite its sources by number.
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="block w-full rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-fg transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} className={cn('flex animate-fade-up', turn.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  turn.role === 'user' ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md bg-surface-2 text-fg'
                )}
              >
                {turn.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the report…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-line p-4">
          {error && <p className="mb-2 text-xs text-bad">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-2 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft"
          >
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={2000}
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              placeholder="Ask a follow-up question…"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-subtle">Enter to send · Shift+Enter for a new line</p>
        </footer>
      </aside>
    </div>,
    document.getElementById('app-root') ?? document.body
  );
};
