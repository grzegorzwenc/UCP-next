"use client";

/**
 * Full-screen confirmation after the business decides in the review (signed off → ready to publish, or back to the author).
 * Shown over the page on the review link and in the builder's full screen.
 */
export function DecisionOverlay({ decision, title, by, at, action }: { decision: "signoff" | "reauthor"; title: string; by: string; at: string; action?: React.ReactNode }) {
  const ok = decision === "signoff";
  const when = new Date(at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <div role="alertdialog" aria-modal="true" aria-labelledby="dec-h" className="fixed inset-0 z-[90] grid place-items-center p-4 bg-[#0F1013]/55 backdrop-blur-[3px] cmt-card-in">
    <div className="w-[min(520px,100%)] bg-surface rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,.35)] overflow-hidden text-center">
      <div className={`h-1.5 ${ok ? "bg-good" : "bg-brand"}`} />
      <div className="px-8 pt-8 pb-7">
        <span className={`mx-auto grid place-items-center w-16 h-16 rounded-full ${ok ? "bg-good-soft text-good" : "bg-brand-soft text-brand"}`}>
          {ok ? <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            : <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>}
        </span>
        <h2 id="dec-h" className="mt-4 text-2xl font-medium">{ok ? "Signed off" : "Sent back to the author"}</h2>
        <p className="mt-1 text-sm text-ink-2"><b className="text-ink">{title}</b></p>
        <p className="mt-3 text-sm text-ink-2 leading-relaxed">{ok ? "The business review is done. The page is ready to publish and the author has it in My tasks." : "The page is back at Build the page. The author makes the changes from the comments and sends it for review again."}</p>
        <p className="mt-3 text-xs text-ink-3" suppressHydrationWarning>{ok ? "Signed off" : "Sent back"} by {by} · {when}</p>
        {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
      </div>
    </div>
  </div>;
}
