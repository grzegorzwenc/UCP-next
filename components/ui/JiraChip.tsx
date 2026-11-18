"use client";
import { jiraLabel } from "@/lib/ucp/jira";
import { Badge } from "@/components/shadcn/badge";

/**
 * The page's Jira ticket, as a badge that opens the ticket in a new tab.
 *
 * It is the same badge as every other one in the app — a shadcn `Badge variant="outline"` carrying
 * a `bdl-badge-*` class from app/bdl/badges.css, which is how `Pill` does it. It used to be a
 * bespoke chip with Atlassian's blue written in as a hex (`#0052CC`) and a `rounded-md` corner:
 * the one badge in the product that was neither a BDL colour nor square.
 */
/** The ticket mark used for the Jira rail tab and the "In UCP-…" badge on a comment — one icon for
 *  Jira across the product. It replaces Atlassian's own logo glyph, which read as an unexplained
 *  shape at 12px and was the only vendor mark in the interface. */
const TICKET = "M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM15 7v2.5M15 12v0M15 14.5V17";

export function JiraChip({ url, className = "" }: { url: string; className?: string }) {
  return <Badge
    variant="outline"
    /* h-6: BDL's own badge height (`.bdl-number-badge`, 1.5rem). The shadcn default is h-5, which
       left it noticeably shorter than the 30px `.btn-sm` it sits beside. */
    className={`bdl-badge-info h-6 font-medium ${className}`}
    render={<a href={url} target="_blank" rel="noopener noreferrer" title={`Open the Jira ticket · ${url}`} onClick={(e) => e.stopPropagation()} />}
  >
    <svg viewBox="0 0 24 24" aria-hidden className="fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={TICKET} /></svg>
    {jiraLabel(url)}<span aria-hidden>↗</span>
  </Badge>;
}
