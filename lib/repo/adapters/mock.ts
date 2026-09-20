import type { ContentRepository, PageView, PageSummary, CreatePageInput, PageContentPatch, ComponentNode, RepoNode } from "../types";
import { RepoError } from "../types";
import { nodeToPage, nodeToSummary, pageToNode, blocksToComponents } from "../mapping";
import { makeBlock, TEMPLATES } from "@/lib/blocks/registry";

/** In-memory JCR-like tree. Same node shapes the Sling adapter produces, so switching backends changes nothing above the port. */
const g = globalThis as unknown as { __ucpRepo?: RepoNode };

function page(parent: string, name: string, title: string, status: PageView["status"], template: string, blocks?: ReturnType<typeof makeBlock>[]): RepoNode {
  const path = `${parent}/${name}`;
  const comps = blocksToComponents(blocks ?? (TEMPLATES.find((t) => t.id === template)?.blocks ?? []).map((b) => makeBlock(b, b === "mast" ? { heading: title } : {})));
  return pageToNode({ path, name, title, status, template, locale: "en-GB", created: "2027-08-20T09:00:00Z", lastModified: "2027-09-14T10:58:00Z", lastModifiedBy: "jordan.mensah", components: comps });
}
function folder(parent: string, name: string, title: string, kids: (p: string) => RepoNode[]): RepoNode {
  const path = `${parent}/${name}`;
  return { path, name, primaryType: "cq:Page", properties: {}, children: [{ path: `${path}/jcr:content`, name: "jcr:content", primaryType: "cq:PageContent", properties: { "jcr:title": title, "sling:resourceType": "hsbc/components/folder", "cq:template": "/conf/hsbc/settings/wcm/templates/folder" } }, ...kids(path)] };
}
function seed(): RepoNode {
  const r = "/content/uk";
  return { path: r, name: "uk", primaryType: "cq:Page", properties: {}, children: [
    { path: `${r}/jcr:content`, name: "jcr:content", primaryType: "cq:PageContent", properties: { "jcr:title": "HSBC UK", "sling:resourceType": "hsbc/components/site" } },
    page(r, "home", "Home", "published", "hub"),
    folder(r, "banking", "Banking", (p) => [page(p, "current-accounts", "Current accounts", "published", "hub"), folder(p, "savings", "Savings", (q) => [page(q, "cash-isa", "Cash ISA", "approved", "rates"), page(q, "fixed-rate-bonds", "Fixed rate bonds", "draft", "rates"), page(q, "easy-access", "Easy access saver", "published", "rates")])]),
    folder(r, "borrowing", "Borrowing", (p) => [
      folder(p, "credit-cards", "Credit cards", (q) => [page(q, "overview", "Credit cards", "published", "hub"),
        page(q, "rewards-credit-cards", "Rewards credit cards", "review", "product", [makeBlock("mast", { heading: "Rewards credit cards", intro: "Discover our range of rewards cards" }), makeBlock("contentmaster"), makeBlock("icontiles"), makeBlock("mastertiles"), makeBlock("banner", { heading: "Need help choosing a credit card?", text: "Discover our range of credit cards and find the one most suitable for you.", cta: "Compare cards", style: "light" }), makeBlock("linktiles"), makeBlock("footnotes")]),
        page(q, "purchase", "Purchase credit cards", "published", "product"), page(q, "balance-transfer", "Balance transfer credit cards", "published", "product"), page(q, "credit-builder", "Credit-builder credit cards", "draft", "product")]),
      folder(p, "mortgages", "Mortgages", (q) => [page(q, "overview", "Mortgages", "published", "hub"), page(q, "rates", "Mortgage rates", "failed", "rates")]),
      folder(p, "loans", "Loans", (q) => [page(q, "overview", "Personal loans", "published", "hub")])]),
    folder(r, "investing", "Investing", (p) => [page(p, "overview", "Investing", "published", "hub")]),
    folder(r, "insurance", "Insurance", (p) => [page(p, "home-insurance", "Home insurance", "published", "product")]),
    folder(r, "campaigns", "Campaigns", (p) => [page(p, "autumn-rates", "Autumn rates campaign", "scheduled", "campaign")]),
    folder(r, "help", "Help", (p) => [page(p, "contact", "Contact us", "published", "hub"), page(p, "branch-finder", "Branch finder", "published", "hub")]),
  ] };
}
const tree = () => (g.__ucpRepo ??= seed());
function find(n: RepoNode, path: string): RepoNode | undefined { if (n.path === path) return n; for (const c of n.children ?? []) { const f = find(c, path); if (f) return f; } }
const parentPath = (p: string) => p.replace(/\/[^/]+$/, "");
const content = (n: RepoNode) => n.children?.find((c) => c.name === "jcr:content");
const pages = (n: RepoNode) => (n.children ?? []).filter((c) => c.name !== "jcr:content");
export function walk(n: RepoNode = tree()): RepoNode[] { return [n, ...pages(n).flatMap(walk)]; }

export const mockRepo: ContentRepository = {
  kind: "mock",
  async identity() { return { id: "jordan.mensah", authType: "mock", groups: ["uk-authors", "uk-reviewers"] }; },
  async getPage(path) { const n = find(tree(), path); return n ? nodeToPage(n) : undefined; },
  async listChildren(path, { offset = 0, limit = 50 } = {}) { const n = find(tree(), path); if (!n) throw new RepoError(404, "Not found"); const kids = pages(n); return { items: kids.slice(offset, offset + limit).map(nodeToSummary), more: kids.length > offset + limit }; },
  async createPage({ parentPath: pp, name, template, title }) { const par = find(tree(), pp); if (!par) throw new RepoError(404, "Parent not found"); if (pages(par).some((c) => c.name === name)) throw new RepoError(409, "A page with that name already exists"); const n = page(pp, name, title || name, "draft", template); const c = content(n); if (c) { const now = new Date().toISOString(); c.properties["jcr:created"] = now; c.properties["cq:lastModified"] = now; } (par.children ??= []).push(n); return nodeToPage(n); },
  async updateContent(path, patch) { const n = find(tree(), path); const c = n && content(n); if (!n || !c) throw new RepoError(404, "Not found"); const map: Record<string, string> = { title: "jcr:title", description: "jcr:description", navTitle: "navTitle", hideInNav: "hideInNav", locale: "jcr:language", status: "ucp:status" }; for (const [k, v] of Object.entries(patch)) if (k in map) c.properties[map[k]] = v; c.properties["cq:lastModified"] = new Date().toISOString(); c.properties["cq:lastModifiedBy"] = "jordan.mensah"; return nodeToPage(n); },
  async saveComponents(path, components: ComponentNode[]) { const n = find(tree(), path); const c = n && content(n); if (!n || !c) throw new RepoError(404, "Not found"); const root: RepoNode = { path: `${path}/jcr:content/root`, name: "root", primaryType: "nt:unstructured", properties: { "sling:resourceType": "hsbc/components/container" }, children: components.map((x) => ({ path: `${path}/jcr:content/root/${x.name}`, name: x.name, primaryType: "nt:unstructured", properties: { "sling:resourceType": x.resourceType, ...x.props } })) }; c.children = [root]; c.properties["cq:lastModified"] = new Date().toISOString(); return nodeToPage(n); },
  async deletePage(path, recursive = false) { const n = find(tree(), path); if (!n) throw new RepoError(404, "Not found"); if (pages(n).length && !recursive) throw new RepoError(409, "Page has children; pass recursive=true"); const par = find(tree(), parentPath(path))!; par.children = par.children!.filter((c) => c !== n); },
  async movePage(path, dest) { const n = find(tree(), path); if (!n) throw new RepoError(404, "Not found"); if (find(tree(), dest)) throw new RepoError(409, "Destination is occupied"); const par = find(tree(), parentPath(path))!; const dp = find(tree(), parentPath(dest)); if (!dp) throw new RepoError(404, "Destination parent not found"); par.children = par.children!.filter((c) => c !== n); const ren = (m: RepoNode) => { m.path = dest + m.path.slice(path.length); m.children?.forEach(ren); }; ren(n); n.name = dest.split("/").pop()!; (dp.children ??= []).push(n); return nodeToPage(n); },
};
export const allSummaries = (root: string): PageSummary[] => walk().filter((n) => n.path.startsWith(root) && n.path !== root && n.name !== "jcr:content").map(nodeToSummary);
