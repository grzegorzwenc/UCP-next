/**
 * A pointer to a tool the backend already ships, shown instead of re-building it here.
 * Opens in a new tab: the tool runs on the backend's own origin, with its own sign-in.
 */
export function BackendTool({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="border border-line bg-surface rounded-lg p-5 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[240px]"><b className="block text-[15px]">{title}</b><p className="text-ink-3 text-[13px] mt-1">{text}</p><code className="block text-[12px] text-ink-4 mt-1.5 break-all">{href}</code></div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn">{action} ↗</a>
    </div>
  );
}
