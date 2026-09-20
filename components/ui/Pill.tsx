const LABEL: Record<string, string> = { draft: "Draft", review: "In review", approved: "Approved", published: "Published", scheduled: "Scheduled", failed: "Publish failed" };
export function Pill({ status, label }: { status: string; label?: string }) { return <span className={`pill pill-${status}`}>{label ?? LABEL[status] ?? status}</span>; }
