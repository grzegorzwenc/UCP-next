/** Client-safe helpers for showing audit events (day grouping, times, where a target links to). */
export const SECTION_TARGETS = ["assets", "models", "api", "templates", "users", "tasks", "pages"];

/** Times are shown in the market's time zone (UK) so the server render and the browser always agree. */
export const DISPLAY_TZ = "Europe/London";
const ymd = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
export function dayOf(iso: string, now = new Date()): string {
  const d = new Date(iso); if (isNaN(d.getTime())) return "Unknown";
  const diff = Math.round((Date.parse(ymd(now)) - Date.parse(ymd(d))) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: DISPLAY_TZ });
}
export const timeOf = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ }); };
export const whenOf = (iso: string) => `${dayOf(iso)} ${timeOf(iso)}`;

export type TargetLink = { kind: "page" | "user" | "section" | "path" | "none"; href?: string; label: string; sub?: string; id?: string };
/** Where an audit target points. `pages` maps repository path → title, `names` user id → display name. */
export function resolveTarget(target: string | undefined, o: { base: string; root: string; pages: Record<string, string>; names: Record<string, string> }): TargetLink {
  if (!target) return { kind: "none", label: "" };
  if (target.startsWith("user:")) { const id = target.slice(5); return { kind: "user", id, href: `${o.base}/users?user=${encodeURIComponent(id)}`, label: o.names[id] ?? id }; }
  if (SECTION_TARGETS.includes(target)) return { kind: "section", href: `${o.base}/${target}`, label: target };
  if (target.startsWith("/content/")) {
    const title = o.pages[target]; const route = target.replace(o.root, "") || "/";
    if (title) return { kind: "page", href: `${o.base}/page${route === "/" ? "" : route}`, label: title, sub: route };
    return { kind: "path", label: route };
  }
  return { kind: "path", label: target };
}
