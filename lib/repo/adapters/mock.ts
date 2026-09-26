import type { ContentRepository, PageView, PageSummary, ComponentNode, RepoNode, NodeProps } from "../types";
import { RepoError } from "../types";
import { nodeToPage, nodeToSummary, pageToNode, blocksToComponents } from "../mapping";
import { makeBlock, TEMPLATES } from "@/lib/blocks/registry";
import { MOCK_MARKETS as MARKETS } from "@/lib/markets";
import { SEED_USERS, SEED_ASSETS, ASSET_FOLDERS, SEED_MODELS, SEED_TEMPLATES, FORMS, ME } from "@/lib/ucp/seed";
import { PATHS } from "@/lib/ucp/paths";
import { sessionUserId } from "@/lib/server/session";

/**
 * In-memory JCR-like repository. One tree rooted at "/" with the same layout the Sling backend will have:
 *   /content/<market>/…            pages (cq:Page → jcr:content → root → components)
 *   /content/dam/<market>/<folder> assets (dam:Asset)
 *   /home/users/<id>               users (rep:User-like, perms as JSON in ucp:perms)
 *   /conf/hsbc/models/<id>         content models (fields as JSON in ucp:fields)
 *   /conf/hsbc/settings/wcm/templates/<id>  page templates
 *   /conf/hsbc/forms/<id>          forms service registry
 *   /var/audit/ucp/<market>/<id>   audit events (append-only)
 * Same node shapes the Sling adapter produces, so switching backends changes nothing above the port.
 */
const g = globalThis as unknown as { __ucpRepo_v12?: RepoNode };

/** Demo timestamps relative to now, so "waiting 2 days" and notification order stay meaningful. */
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const node = (path: string, primaryType: string, properties: NodeProps = {}, children?: RepoNode[]): RepoNode => ({ path, name: path.split("/").pop() || "", primaryType, properties, children });
function page(parent: string, name: string, title: string, status: PageView["status"], template: string, blocks?: ReturnType<typeof makeBlock>[], extra: NodeProps = {}): RepoNode {
  const path = `${parent}/${name}`;
  const comps = blocksToComponents(blocks ?? (TEMPLATES.find((t) => t.id === template)?.blocks ?? []).map((b) => makeBlock(b, b === "mast" ? { heading: title } : {})));
  const authors = [ME, "anna.kowalczyk", "sunita.patel", ME, "elin.llewelyn"]; const h = path.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const day = 1 + (h % 18); const lastModified = `2027-09-${String(day).padStart(2, "0")}T${String(8 + (h % 9)).padStart(2, "0")}:${String(h % 60).padStart(2, "0")}:00Z`;
  return pageToNode({ path, name, title, status, template, locale: "en-GB", created: "2027-08-20T09:00:00Z", lastModified, lastModifiedBy: authors[h % authors.length], meta: extra, components: comps });
}
function folder(parent: string, name: string, title: string, kids: (p: string) => RepoNode[]): RepoNode {
  const path = `${parent}/${name}`;
  return node(path, "cq:Page", {}, [node(`${path}/jcr:content`, "cq:PageContent", { "jcr:title": title, "sling:resourceType": "hsbc/components/folder", "cq:template": "/conf/hsbc/settings/wcm/templates/folder" }), ...kids(path)]);
}
function seedUk(r: string): RepoNode[] {
  return [
    node(`${r}/jcr:content`, "cq:PageContent", { "jcr:title": "HSBC UK", "sling:resourceType": "hsbc/components/site" }),
    page(r, "home", "Home", "published", "hub"),
    folder(r, "banking", "Banking", (p) => [page(p, "current-accounts", "Current accounts", "published", "hub"), folder(p, "savings", "Savings", (q) => [page(q, "cash-isa", "Cash ISA", "approved", "rates", undefined, { "ucp:sentBy": "rachel.hughes", "ucp:sentAt": ago(2) }), page(q, "fixed-rate-bonds", "Fixed rate bonds", "draft", "rates"), page(q, "easy-access", "Easy access saver", "published", "rates", [makeBlock("mast", { heading: "{{product.title}}", intro: "{{product.description}}", cta: "{{product.cta}}", image: "hero-savings" }), makeBlock("facts"), makeBlock("rates"), makeBlock("faq"), makeBlock("disclaimer")], { "ucp:bindings": JSON.stringify({ product: "/content/entities/uk/product/hsbc-savings-account" }) })])]),
    folder(r, "borrowing", "Borrowing", (p) => [
      folder(p, "credit-cards", "Credit cards", (q) => [page(q, "overview", "Credit cards", "published", "hub"),
        page(q, "rewards-credit-cards", "Rewards credit cards", "review", "product", [makeBlock("mast", { heading: "Rewards credit cards", intro: "Discover our range of rewards cards", image: "hero-cards" }), makeBlock("contentmaster"), makeBlock("icontiles"), makeBlock("mastertiles"), makeBlock("banner", { heading: "Need help choosing a credit card?", text: "Discover our range of credit cards and find the one most suitable for you.", cta: "Compare cards", style: "light" }), makeBlock("linktiles"), makeBlock("footnotes")], { "ucp:sentBy": "anna.kowalczyk", "ucp:sentAt": ago(1), "ucp:assignee": "rachel.hughes" }),
        page(q, "purchase", "Purchase credit cards", "published", "product"), page(q, "balance-transfer", "Balance transfer credit cards", "published", "product"), page(q, "credit-builder", "Credit-builder credit cards", "draft", "product")]),
      folder(p, "mortgages", "Mortgages", (q) => [page(q, "overview", "Mortgages", "published", "hub", [makeBlock("mast", { heading: "Mortgages", intro: "Find a mortgage that fits your plans", image: "hero-mortgage" }), makeBlock("contentmaster"), makeBlock("linktiles"), makeBlock("banner")]), page(q, "rates", "Mortgage rates", "failed", "rates")]),
      folder(p, "loans", "Loans", (q) => [page(q, "overview", "Personal loans", "published", "hub")])]),
    folder(r, "investing", "Investing", (p) => [page(p, "overview", "Investing", "published", "hub"), page(p, "ready-made", "Ready-made investments", "review", "product", undefined, { "ucp:sentBy": "sunita.patel", "ucp:sentAt": ago(3), "ucp:assignee": "rachel.hughes" })]),
    folder(r, "insurance", "Insurance", (p) => [page(p, "home-insurance", "Home insurance", "published", "product", [makeBlock("mast", { heading: "Home insurance", intro: "Cover for your home and what's in it", image: "hero-home" }), makeBlock("contentmaster"), makeBlock("icontiles"), makeBlock("faq"), makeBlock("footnotes")])]),
    folder(r, "campaigns", "Campaigns", (p) => [page(p, "autumn-rates", "Autumn rates campaign", "scheduled", "campaign", [makeBlock("mast", { heading: "Autumn rates campaign", intro: "Limited-time rates on savings", image: "campaign-autumn" }), makeBlock("text"), makeBlock("banner"), makeBlock("form"), makeBlock("disclaimer")], { "ucp:sentBy": "michael.osei", "ucp:publishAt": "2027-10-01T06:00:00Z" })]),
    folder(r, "help", "Help", (p) => [page(p, "contact", "Contact us", "published", "hub"), page(p, "branch-finder", "Branch finder", "published", "hub")]),
  ];
}
/** Other markets: a smaller copy of the UK site with market-specific statuses, so switching market really changes the data. */
function seedMarket(m: (typeof MARKETS)[number]): RepoNode[] {
  let k = m.id.charCodeAt(0) * 31 + m.id.charCodeAt(1); const rnd = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
  const statuses: PageView["status"][] = ["published", "published", "published", "draft", "review", "approved", "scheduled"];
  const clone = (n: RepoNode): RepoNode | null => {
    const c = n.children?.find((x) => x.name === "jcr:content"); const isFolder = String(c?.properties["sling:resourceType"] ?? "").endsWith("/folder");
    if (n.name === "jcr:content") return null;
    if (isFolder) { if (rnd() < 0.25) return null; const kids = (n.children ?? []).map(clone).filter(Boolean) as RepoNode[]; return node(n.path.replace("/content/uk", m.root), "cq:Page", {}, [node(`${n.path.replace("/content/uk", m.root)}/jcr:content`, "cq:PageContent", { ...c!.properties }), ...kids]); }
    const v = nodeToPage(n); const st = m.status === "On AEM" ? "draft" : statuses[Math.floor(rnd() * statuses.length)];
    return pageToNode({ ...v, path: n.path.replace("/content/uk", m.root), status: st, locale: m.locales[0], lastModifiedBy: ({ hk: "l.chen", sg: "a.tan", fr: "c.moreau", de: "k.schmidt", mx: "d.ramirez", ae: "s.haddad" } as Record<string, string>)[m.id] ?? ME, meta: { ...(v.meta ?? {}), "jcr:language": m.locales[0], "ucp:status": st } });
  };
  const uk = seedUk("/content/uk");
  return [node(`${m.root}/jcr:content`, "cq:PageContent", { "jcr:title": m.name, "sling:resourceType": "hsbc/components/site" }), ...uk.map(clone).filter(Boolean) as RepoNode[]];
}
function seed(): RepoNode {
  const content = node("/content", "sling:OrderedFolder", {}, [
    ...MARKETS.map((m) => node(m.root, "cq:Page", {}, m.id === "uk" ? seedUk(m.root) : seedMarket(m))),
    node("/content/dam", "sling:Folder", {}, MARKETS.map((m) => node(`${PATHS.dam(m.id)}`, "sling:Folder", { "jcr:title": `${m.name} assets` }, ASSET_FOLDERS.map((fo) => node(`${PATHS.dam(m.id)}/${fo}`, "sling:Folder", { "jcr:title": fo }, m.id === "uk" ? SEED_ASSETS.filter((a) => a.folder === fo).map((a) => node(`${PATHS.dam(m.id)}/${fo}/${a.name}`, "dam:Asset", { "jcr:title": a.name, "ucp:id": a.id, "dam:type": a.type, "dam:size": a.size, "dam:width": a.width, "dam:height": a.height, "dam:folder": a.folder, "jcr:created": "2027-09-01T10:00:00Z", "jcr:createdBy": "anna.taylor" })) : []))))),
  ]);
  const ent = (id: string, title: string, values: Record<string, unknown>) => node(`${PATHS.entities("uk")}/product/${id}`, "nt:unstructured", { "jcr:title": title, "ucp:model": "product", "ucp:status": "published", "ucp:values": JSON.stringify(values), "ucp:publishedValues": JSON.stringify(values), "cq:lastModified": "2027-09-12T10:00:00Z", "cq:lastModifiedBy": "priya.kaur" });
  content.children!.push(node("/content/entities", "sling:Folder", {}, [node(PATHS.entities("uk"), "sling:Folder", {}, [node(`${PATHS.entities("uk")}/product`, "sling:Folder", { "jcr:title": "Product" }, [
    ent("hsbc-current-account", "HSBC Current Account", { title: "HSBC Current Account", description: "An everyday account with a contactless debit card and the HSBC UK app.", image: "hero-home", category: "Current accounts", cta: "Open an account" }),
    ent("hsbc-savings-account", "HSBC Savings Account", { title: "Flexible Saver", description: "Save as much as you like and take money out when you need it.", image: "hero-savings", category: "Savings", cta: "Start saving" }),
    ent("hsbc-credit-card", "HSBC Credit Card", { title: "Rewards Credit Card", description: "Earn reward points on eligible purchases, with 26.9% APR representative (variable).", image: "hero-cards", category: "Credit cards", cta: "Apply now" }),
  ])])]));
  const home = node("/home", "rep:AuthorizableFolder", {}, [node("/home/users", "rep:AuthorizableFolder", {}, SEED_USERS.map((u) => node(`${PATHS.users}/${u.id}`, "rep:User", { "rep:principalName": u.id, "profile/givenName": u.name.split(" ")[0], "profile/familyName": u.name.split(" ").slice(1).join(" "), "profile/email": u.email, "ucp:name": u.name, "ucp:role": u.role, "ucp:team": u.team, "ucp:perms": JSON.stringify(u.perms) })))]);
  const conf = node("/conf", "sling:Folder", {}, [node("/conf/hsbc", "sling:Folder", {}, [
    node(PATHS.models, "sling:Folder", {}, SEED_MODELS.map((m) => node(`${PATHS.models}/${m.id}`, "nt:unstructured", { "jcr:title": m.name, "jcr:description": m.description, "ucp:group": m.group, "ucp:version": m.version, "ucp:publishedVersion": m.version, "ucp:status": "published", "ucp:source": m.source, "ucp:fields": JSON.stringify(m.fields), "ucp:publishedFields": JSON.stringify(m.fields), "cq:lastModified": "2027-09-10T09:30:00Z", "cq:lastModifiedBy": "priya.kaur" }))),
    node("/conf/hsbc/settings", "sling:Folder", {}, [node("/conf/hsbc/settings/wcm", "sling:Folder", {}, [node(PATHS.templates, "sling:Folder", {}, SEED_TEMPLATES.map((t) => node(`${PATHS.templates}/${t.id}`, "cq:Template", { "jcr:title": t.name, "jcr:description": t.desc, "ucp:blocks": t.blocks.join(","), "ucp:folder": t.folder })))])]),
    node(PATHS.forms, "sling:Folder", {}, FORMS.map((f) => node(`${PATHS.forms}/${f.id}`, "nt:unstructured", { "jcr:title": f.name, "ucp:version": f.version }))),
  ])]);
  const audit = (m: string, i: number, time: string, type: string, who: string, text: string, target?: string, level?: string) => node(`${PATHS.audit(m)}/${time.replace(/[^0-9]/g, "").slice(0, 14)}-${i}`, "nt:unstructured", { "ucp:time": time, "ucp:type": type, "ucp:who": who, "ucp:text": text, "ucp:target": target, "ucp:level": level });
  const d = new Date(); const today = (h: number, mi: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi).toISOString(); const daysAgo = (n: number, h: number, mi: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, h, mi).toISOString();
  const varNode = node("/var", "sling:Folder", {}, [node("/var/audit", "sling:Folder", {}, [node("/var/audit/ucp", "sling:Folder", {}, MARKETS.map((m) => node(PATHS.audit(m.id), "sling:Folder", {}, m.id !== "uk" ? [] : [
    audit("uk", 1, today(11, 2), "content", "jordan.mensah", "edited Masthead on Fixed rate bonds (draft v3)", "/content/uk/banking/savings/fixed-rate-bonds"),
    audit("uk", 2, today(10, 58), "publishing", "system", "published Current accounts v22, approved by Rachel Hughes", "/content/uk/banking/current-accounts"),
    audit("uk", 3, today(9, 41), "system", "system", "publish of Mortgage rates v31 failed: image renditions timed out. v30 is still live.", "/content/uk/borrowing/mortgages/rates", "crit"),
    audit("uk", 4, today(8, 55), "permissions", "priya.kaur", "gave Elin Llewelyn Edit on Banking", "user:elin.llewelyn"),
    audit("uk", 5, today(8, 20), "content", "anna.kowalczyk", "sent Rewards credit cards v17 for review", "/content/uk/borrowing/credit-cards/rewards-credit-cards"),
    audit("uk", 6, daysAgo(1, 17, 10), "publishing", "rachel.hughes", "approved Cash ISA v14", "/content/uk/banking/savings/cash-isa"),
    audit("uk", 7, daysAgo(1, 14, 32), "content", "anna.taylor", "uploaded hero-savings-couple.jpg", "assets"),
    audit("uk", 8, daysAgo(1, 9, 5), "permissions", "priya.kaur", "changed Tunde Boateng’s role to Viewer", "user:tunde.boateng"),
    audit("uk", 9, daysAgo(7, 16, 40), "system", "system", "deployment 2027.09.13-2 to Production completed in 4 m 12 s", "api"),
    audit("uk", 10, daysAgo(7, 11, 15), "content", "sunita.patel", "created Ready-made investments in Investing", "/content/uk/investing/ready-made"),
  ])))])]);
  // Give the demo "User" account (content.author) a couple of drafts of their own, so their task list is not empty.
  for (const n of walk(content)) if (["credit-builder", "fixed-rate-bonds"].includes(n.name)) { const c = n.children?.find((x) => x.name === "jcr:content"); if (c) c.properties["cq:lastModifiedBy"] = "content.author"; }
  return node("/", "rep:root", {}, [content, home, conf, varNode]);
}
const tree = () => (g.__ucpRepo_v12 ??= seed());
function find(n: RepoNode, path: string): RepoNode | undefined { if (n.path === path) return n; if (path !== "/" && !path.startsWith(n.path === "/" ? "/" : n.path + "/")) return undefined; for (const c of n.children ?? []) { const f = find(c, path); if (f) return f; } }
const parentPath = (p: string) => p.replace(/\/[^/]+$/, "") || "/";
const content = (n: RepoNode) => n.children?.find((c) => c.name === "jcr:content");
const pages = (n: RepoNode) => (n.children ?? []).filter((c) => c.name !== "jcr:content");
export function walk(n: RepoNode): RepoNode[] { return [n, ...pages(n).flatMap(walk)]; }
function prune(n: RepoNode, depth: number): RepoNode { return depth <= 0 ? { ...n, children: undefined } : { ...n, children: n.children?.map((c) => prune(c, depth - 1)) }; }
const need = (path: string) => { const n = find(tree(), path); if (!n) throw new RepoError(404, "Not found", path); return n; };

export const mockRepo: ContentRepository = {
  kind: "mock",
  async identity() { const id = (await sessionUserId()) ?? ME; return { id, authType: "session", groups: [`uk-${id.split(".")[0]}`] }; },
  async getNode(path, depth = 1) { const n = find(tree(), path); return n && prune(n, depth); },
  async createNode(path, primaryType, props = {}) { if (find(tree(), path)) throw new RepoError(409, "Node already exists", path); const pp = parentPath(path); let par = find(tree(), pp); if (!par) { par = await mockRepo.createNode(pp, "sling:Folder"); par = find(tree(), pp)!; } const n = node(path, primaryType, { ...props, "jcr:created": new Date().toISOString() }); (par.children ??= []).push(n); return prune(n, 1); },
  async setProps(path, props) { const n = need(path); for (const [k, v] of Object.entries(props)) { if (v === null || v === undefined) delete n.properties[k]; else n.properties[k] = v; } return prune(n, 1); },
  async putFile(path, data, mime) { const n = find(tree(), path) ?? await mockRepo.createNode(path, "nt:file"); const real = find(tree(), n.path)!; real.properties["jcr:mimeType"] = mime; real.properties["ucp:data"] = `data:${mime};base64,${Buffer.from(data).toString("base64")}`; real.properties["jcr:lastModified"] = new Date().toISOString(); return prune(real, 0); },
  async deleteNode(path) { const n = need(path); const par = find(tree(), parentPath(path))!; par.children = par.children!.filter((c) => c !== n); },
  async moveNode(path, dest) { const n = need(path); if (find(tree(), dest)) throw new RepoError(409, "Destination is occupied", dest); const par = find(tree(), parentPath(path))!; const dp = find(tree(), parentPath(dest)); if (!dp) throw new RepoError(404, "Destination parent not found", parentPath(dest)); par.children = par.children!.filter((c) => c !== n); const ren = (m: RepoNode) => { m.path = dest + m.path.slice(path.length); m.name = m.path.split("/").pop()!; m.children?.forEach(ren); }; ren(n); (dp.children ??= []).push(n); return prune(n, 1); },
  async getPage(path) { const n = find(tree(), path); return n && content(n) ? nodeToPage(n) : undefined; },
  async listChildren(path, { offset = 0, limit = 50 } = {}) { const n = need(path); const kids = pages(n).filter((c) => c.primaryType === "cq:Page"); return { items: kids.slice(offset, offset + limit).map(nodeToSummary), more: kids.length > offset + limit }; },
  async createPage({ parentPath: pp, name, template, title }) { const par = need(pp); if (pages(par).some((c) => c.name === name)) throw new RepoError(409, "A page with that name already exists", `${pp}/${name}`); const n = page(pp, name, title || name, "draft", template); const c = content(n); if (c) { const now = new Date().toISOString(); c.properties["jcr:created"] = now; c.properties["cq:lastModified"] = now; } (par.children ??= []).push(n); return nodeToPage(n); },
  async updateContent(path, patch) { const n = need(path); const c = content(n); if (!c) throw new RepoError(404, "Not a page", path); const map: Record<string, string> = { title: "jcr:title", description: "jcr:description", navTitle: "navTitle", hideInNav: "hideInNav", locale: "jcr:language", status: "ucp:status" }; for (const [k, v] of Object.entries(patch)) if (k in map) c.properties[map[k]] = v; c.properties["cq:lastModified"] = new Date().toISOString(); c.properties["cq:lastModifiedBy"] = (await mockRepo.identity()).id; return nodeToPage(n); },
  async saveComponents(path, components: ComponentNode[]) { const n = need(path); const c = content(n); if (!c) throw new RepoError(404, "Not a page", path); const root: RepoNode = node(`${path}/jcr:content/root`, "nt:unstructured", { "sling:resourceType": "hsbc/components/container" }, components.map((x) => node(`${path}/jcr:content/root/${x.name}`, "nt:unstructured", { "sling:resourceType": x.resourceType, ...x.props }))); c.children = [...(c.children ?? []).filter((x) => x.name !== "root"), root]; c.properties["cq:lastModified"] = new Date().toISOString(); c.properties["cq:lastModifiedBy"] = (await mockRepo.identity()).id; return nodeToPage(n); },
  async deletePage(path, recursive = false) { const n = need(path); if (pages(n).length && !recursive) throw new RepoError(409, "Page has children; pass recursive=true"); const par = find(tree(), parentPath(path))!; par.children = par.children!.filter((c) => c !== n); },
  async movePage(path, dest) { const n = await mockRepo.moveNode(path, dest); return nodeToPage(find(tree(), n.path)!); },
};
/** Whole market listing (pages and folders) for dashboard / search on the mock backend. */
export const allSummaries = (root: string): PageSummary[] => { const r = find(tree(), root); return r ? walk(r).filter((n) => n.path !== root && n.primaryType === "cq:Page").map(nodeToSummary) : []; };
