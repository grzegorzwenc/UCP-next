"use client";
import { jiraLabel } from "@/lib/ucp/jira";

/** The page's Jira ticket: a small blue chip that opens the ticket in a new tab. */
export function JiraChip({ url, className = "" }: { url: string; className?: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" title={`Open the Jira ticket · ${url}`} onClick={(e) => e.stopPropagation()}
    className={`inline-flex items-center gap-1 flex-none rounded-md border border-[#0052CC]/30 bg-[#0052CC]/[.07] text-[#0052CC] px-1.5 py-px text-xs font-medium hover:bg-[#0052CC]/15 whitespace-nowrap ${className}`}>
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden fill="currentColor"><path d="M11.6 2 2 11.6l4.4 4.4L12 10.4l5.6 5.6 4.4-4.4L12.4 2a.6.6 0 0 0-.8 0zM12 13.6 9.6 16 12 18.4l2.4-2.4z" /></svg>
    {jiraLabel(url)}<span aria-hidden>↗</span></a>;
}
