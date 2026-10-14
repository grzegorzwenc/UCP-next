/** Jira links on pages: a full https link or just the ticket key (UCP-123), which goes to the bank's Jira. */
export const JIRA_BASE = "https://hsbc.atlassian.net/browse/";
const KEY = /^[A-Z][A-Z0-9_]+-\d+$/;
/** Normalise what someone typed: "ucp-123" → base + "UCP-123"; an https link stays as it is; anything else → null. */
export function jiraUrl(input: string): string | null {
  const v = input.trim(); if (!v) return null;
  if (KEY.test(v.toUpperCase()) && !v.includes("/")) return JIRA_BASE + v.toUpperCase();
  try { const u = new URL(v); return u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}
/** What to show on the chip: the ticket key when the link has one, else the host. */
export function jiraLabel(url: string): string { const m = url.match(/([A-Z][A-Z0-9_]+-\d+)(?:[/?#]|$)/); if (m) return m[1]; try { return new URL(url).host; } catch { return "Jira"; } }
