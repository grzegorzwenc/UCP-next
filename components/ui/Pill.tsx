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
export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  review: "Awaiting review",
  inreview: "Author review",
  reviewed: "Reviewed",
  bizreview: "Business review",
  approved: "Ready",
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
  const text = label ?? STATUS_LABEL[status] ?? status;
  /* max-w-full + truncate so a long label can never spill out of a fixed-width table cell and
     over the column beside it; the title keeps the full wording reachable. */
  return (
    <Badge variant="outline" className={`max-w-full truncate font-normal ${TONE[status] ?? "bdl-badge-neutral"}`} title={typeof text === "string" ? text : undefined}>
      {text}
    </Badge>
  );
}
