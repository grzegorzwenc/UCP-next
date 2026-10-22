import {
  LayoutDashboard, FileText, Image as ImageIcon, Database, Shapes, LayoutTemplate,
  ListChecks, Code2, Users, ShieldCheck, Star,
} from "lucide-react";

/**
 * The one list of CMS sections. The sidebar renders it, the breadcrumb resolves labels from
 * it; before this existed the labels were written twice and drifted.
 * `slug` is the first path segment after /[market]/[env].
 */
export type NavItem = { slug: string; label: string; icon: React.ComponentType<{ className?: string }> };
export type NavSection = { label?: string; items: NavItem[] };

export const NAV: NavSection[] = [
  { items: [{ slug: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Content", items: [
    { slug: "pages", label: "Pages", icon: FileText },
    { slug: "assets", label: "Assets", icon: ImageIcon },
    { slug: "entities", label: "Content entities", icon: Database },
  ] },
  { label: "Structure", items: [
    { slug: "models", label: "Content models", icon: Shapes },
    { slug: "templates", label: "Templates", icon: LayoutTemplate },
  ] },
  { label: "Work", items: [{ slug: "tasks", label: "My tasks", icon: ListChecks }] },
  { label: "Platform", items: [
    { slug: "api", label: "API & delivery", icon: Code2 },
    { slug: "users", label: "Users & roles", icon: Users },
    { slug: "audit", label: "Audit log", icon: ShieldCheck },
    { slug: "benefits", label: "Why UCP", icon: Star },
  ] },
];

const BY_SLUG = new Map(NAV.flatMap((s) => s.items.map((i) => [i.slug, i] as const)));
/** The page builder lives under /page/* but belongs to Pages. */
export const navSlug = (seg: string) => (seg === "page" ? "pages" : seg || "dashboard");
export const navLabel = (slug: string) => BY_SLUG.get(navSlug(slug))?.label ?? slug;

export type Crumb = { label: string; href?: string };
/**
 * Breadcrumb for a CMS path: the section, then the rest of the path when there is any
 * (a page under /page/..., a template id). The last crumb is the current page and has no href.
 */
export function crumbsFor(pathname: string, marketId: string, envId: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean).slice(2); // drop market + env
  const seg = parts[0] ?? "dashboard";
  const base = `/${marketId}/${envId}`;
  const section: Crumb = { label: navLabel(seg), href: `${base}/${navSlug(seg)}` };
  const rest = parts.slice(1).filter((p) => p !== "");
  if (!rest.length) return [{ label: section.label }];
  /* /page/borrowing/credit-cards → "Pages" › "credit-cards"; the leaf is what you are on */
  return [section, { label: decodeURIComponent(rest[rest.length - 1]) }];
}
