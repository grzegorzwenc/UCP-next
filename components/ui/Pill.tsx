import { Badge } from "@/components/shadcn/badge";

/**
 * Status badge. BDL's own treatment: a shadcn `Badge variant="outline"` carrying one of the five
 * `bdl-badge-*` classes from app/bdl/badges.css — square corners, a coloured border and a tinted
 * background, no dot. This replaces a bespoke `.pill` class that was rounded (`border-radius:
 * 999px`) and duplicated what BDL already had.
 *
 * The workflow has nine states and BDL has five badge colours, so states share a colour and the
 * label carries the distinction — which is how the source project does it too (three lifecycle
 * states over the same five).
 */
const LABEL: Record<string, string> = {
  draft: "Draft",
  review: "Waiting for author's review assignment",
  inreview: "In author's review",
  reviewed: "Reviewed",
  bizreview: "In business review",
  approved: "Ready to publish",
  published: "Published",
  scheduled: "Scheduled",
  failed: "Publish failed",
};

const TONE: Record<string, string> = {
  draft: "bdl-badge-neutral",
  review: "bdl-badge-info",
  inreview: "bdl-badge-info",
  reviewed: "bdl-badge-success",
  bizreview: "bdl-badge-warning",
  approved: "bdl-badge-info",
  scheduled: "bdl-badge-warning",
  published: "bdl-badge-success",
  failed: "bdl-badge-error",
};

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant="outline" className={`font-normal ${TONE[status] ?? "bdl-badge-neutral"}`}>
      {label ?? LABEL[status] ?? status}
    </Badge>
  );
}
