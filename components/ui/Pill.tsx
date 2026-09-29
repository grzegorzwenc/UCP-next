const LABEL: Record<string, string> = { draft: "Draft", review: "Author's review", bizreview: "Business review", approved: "Ready to publish", published: "Published", scheduled: "Scheduled", failed: "Publish failed" };
export function Pill({ status, label }: { status: string; label?: string }) { return <span className={`pill pill-${status}`}>{label ?? LABEL[status] ?? status}</span>; }
