"use client";

/** Step indicator for multi-step dialogs (Publish, Translate): done steps get a ✓, the current one is red. */
export function Steps({ labels, current, onGo }: { labels: string[]; current: number; /** jump back to a done step */ onGo?: (i: number) => void }) {
  return <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-4" aria-label="Steps">{labels.map((l, i) => {
    const done = i < current, on = i === current;
    const dot = <span className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold flex-none ${done ? "bg-good text-white" : on ? "bg-brand text-white" : "bg-surface-3 text-ink-3"}`}>{done ? "✓" : i + 1}</span>;
    return <li key={l} className="flex items-center gap-2">{i > 0 && <span aria-hidden className={`w-5 h-px ${done || on ? "bg-ink-4" : "bg-line-2"}`} />}
      {done && onGo ? <button type="button" onClick={() => onGo(i)} className="flex items-center gap-1.5 text-ink-2 hover:underline">{dot}{l}</button>
        : <span className={`flex items-center gap-1.5 ${on ? "font-medium text-ink" : "text-ink-3"}`} aria-current={on ? "step" : undefined}>{dot}{l}</span>}</li>;
  })}</ol>;
}
