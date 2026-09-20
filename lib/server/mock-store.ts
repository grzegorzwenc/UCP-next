import "server-only";
import type { ContentV1Page, ContentV1PageList, ContentV1CreatePage, Block, PageStatus } from "@/lib/api/types";
import { makeBlock, TEMPLATES } from "@/lib/blocks/registry";

/** In-memory ContentLIBRE stand-in: same repository-path model as content-v1, plus UCP status/blocks. Resets on server restart. */
type Node = ContentV1Page & { kind: "folder" | "page"; children?: Node[]; blocks?: Block[] };
const g = globalThis as unknown as { __ucpStore?: Node };

function P(parent: string, name: string, title: string, status: PageStatus, template: string, blocks?: Block[]): Node {
  const path = `${parent}/${name}`.replace(/\/+/g, "/");
  return { kind: "page", path, name, title, status, template, locale: "en-GB", created: "2027-08-20T09:00:00Z", lastModified: "2027-09-14T10:58:00Z",
    blocks: blocks ?? (TEMPLATES.find((t) => t.id === template)?.blocks ?? []).map((b) => makeBlock(b, b === "mast" ? { heading: title } : {})) };
}
function F(parent: string, name: string, title: string, children: (parent: string) => Node[]): Node {
  const path = `${parent}/${name}`.replace(/\/+/g, "/");
  return { kind: "folder", path, name, title, template: "folder", children: children(path) };
}
function seed(): Node {
  const root: Node = { kind: "folder", path: "/content/uk", name: "uk", title: "HSBC UK", template: "site", children: [] };
  root.children = [
    P(root.path, "home", "Home", "published", "hub"),
    F(root.path, "banking", "Banking", (p) => [
      P(p, "current-accounts", "Current accounts", "published", "hub"),
      F(p, "savings", "Savings", (q) => [P(q, "cash-isa", "Cash ISA", "approved", "rates"), P(q, "fixed-rate-bonds", "Fixed rate bonds", "draft", "rates"), P(q, "easy-access", "Easy access saver", "published", "rates")]),
    ]),
    F(root.path, "borrowing", "Borrowing", (p) => [
      F(p, "credit-cards", "Credit cards", (q) => [
        P(q, "overview", "Credit cards", "published", "hub"),
        P(q, "rewards-credit-cards", "Rewards credit cards", "review", "product", [makeBlock("mast", { heading: "Rewards credit cards", intro: "Discover our range of rewards cards" }), makeBlock("contentmaster"), makeBlock("icontiles"), makeBlock("mastertiles"), makeBlock("banner", { heading: "Need help choosing a credit card?", text: "Discover our range of credit cards and find the one most suitable for you.", cta: "Compare cards", style: "light" }), makeBlock("linktiles"), makeBlock("footnotes")]),
        P(q, "purchase", "Purchase credit cards", "published", "product"), P(q, "balance-transfer", "Balance transfer credit cards", "published", "product"), P(q, "credit-builder", "Credit-builder credit cards", "draft", "product"),
      ]),
      F(p, "mortgages", "Mortgages", (q) => [P(q, "overview", "Mortgages", "published", "hub"), P(q, "rates", "Mortgage rates", "failed", "rates")]),
      F(p, "loans", "Loans", (q) => [P(q, "overview", "Personal loans", "published", "hub")]),
    ]),
    F(root.path, "investing", "Investing", (p) => [P(p, "overview", "Investing", "published", "hub")]),
    F(root.path, "insurance", "Insurance", (p) => [P(p, "home-insurance", "Home insurance", "published", "product")]),
    F(root.path, "campaigns", "Campaigns", (p) => [P(p, "autumn-rates", "Autumn rates campaign", "scheduled", "campaign")]),
    F(root.path, "help", "Help", (p) => [P(p, "contact", "Contact us", "published", "hub"), P(p, "branch-finder", "Branch finder", "published", "hub")]),
  ];
  return root;
}
const store = () => (g.__ucpStore ??= seed());

function find(node: Node, path: string): Node | undefined {
  if (node.path === path) return node;
  for (const c of node.children ?? []) { const f = find(c, path); if (f) return f; }
  return undefined;
}
function parentOf(path: string) { return path.replace(/\/[^/]+$/, ""); }
const pub = (n: Node): ContentV1Page => { const { kind, children, ...rest } = n; void kind; void children; return { ...rest, template: n.template, ...(n.kind === "folder" ? { hideInNav: false } : {}) }; };
export function walkAll(node: Node = store()): Node[] { return [node, ...(node.children ?? []).flatMap((c) => walkAll(c))]; }

export const mock = {
  getPage(path: string) { const n = find(store(), path); return n ? pub(n) : undefined; },
  children(path: string, offset = 0, limit = 50): ContentV1PageList | undefined {
    const n = find(store(), path); if (!n) return undefined;
    const items = (n.children ?? []).slice(offset, offset + limit).map(pub);
    return { items, offset, limit, more: (n.children ?? []).length > offset + limit };
  },
  createPage(body: ContentV1CreatePage) {
    const parent = find(store(), body.parentPath); if (!parent) return { error: 404 as const };
    if ((parent.children ?? []).some((c) => c.name === body.name)) return { error: 409 as const };
    const n = P(parent.path, body.name, body.title || body.name, "draft", body.template);
    (parent.children ??= []).push(n); return { page: pub(n) };
  },
  patchPage(path: string, patch: Partial<ContentV1Page>) {
    const n = find(store(), path); if (!n) return undefined;
    const allow: (keyof ContentV1Page)[] = ["title", "description", "navTitle", "hideInNav", "locale", "template", "status", "blocks"];
    for (const k of allow) if (k in patch) (n as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
    n.lastModified = new Date().toISOString(); return pub(n);
  },
  deletePage(path: string, recursive: boolean) {
    const n = find(store(), path); if (!n) return 404 as const;
    if ((n.children?.length ?? 0) > 0 && !recursive) return 409 as const;
    const par = find(store(), parentOf(path)); if (!par) return 404 as const;
    par.children = (par.children ?? []).filter((c) => c !== n); return 204 as const;
  },
  movePage(path: string, destinationPath: string) {
    const n = find(store(), path); if (!n) return 404 as const;
    if (find(store(), destinationPath)) return 409 as const;
    const par = find(store(), parentOf(path)); const dest = find(store(), parentOf(destinationPath)); if (!par || !dest) return 404 as const;
    par.children = (par.children ?? []).filter((c) => c !== n);
    const rename = (m: Node, from: string, to: string) => { m.path = to + m.path.slice(from.length); m.children?.forEach((c) => rename(c, from, to)); };
    rename(n, n.path, destinationPath); n.name = destinationPath.split("/").pop()!; (dest.children ??= []).push(n); return pub(n);
  },
  me() { return { id: "jordan.mensah", authType: "mock", groups: ["uk-authors", "uk-reviewers"] }; },
};
