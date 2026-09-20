import "server-only";
import { mock, walkAll } from "./mock-store";
import type { ContentV1Page, ContentV1PageList } from "@/lib/api/types";

/** Server-side reads. In live mode they go straight to ContentLIBRE (no BFF hop); in mock mode to the in-memory store. */
const MODE = process.env.CONTENTLIBRE_MODE === "live" ? "live" : "mock";
async function liveFetch<T>(path: string, query: Record<string, string | number>): Promise<T> {
  const base = process.env.CONTENTLIBRE_API_URL!.replace(/\/$/, "");
  const auth = "Basic " + Buffer.from(`${process.env.CONTENTLIBRE_USER}:${process.env.CONTENTLIBRE_PASSWORD ?? ""}`).toString("base64");
  const res = await fetch(`${base}/${path}?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`, { headers: { Authorization: auth, "X-Requested-With": "ContentLIBRE", Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`ContentLIBRE ${res.status} on ${path}`);
  return res.json();
}
export async function getPage(path: string): Promise<ContentV1Page | undefined> {
  if (MODE === "live") return liveFetch<ContentV1Page>("content/v1/page", { path }).catch(() => undefined);
  return mock.getPage(path);
}
export async function children(path: string): Promise<ContentV1PageList> {
  if (MODE === "live") return liveFetch<ContentV1PageList>("content/v1/children", { path, offset: 0, limit: 200 });
  return mock.children(path) ?? { items: [], offset: 0, limit: 50, more: false };
}
/** Whole-site listing for dashboards/search (mock only; live mode walks children lazily). */
export async function allPages(root: string): Promise<ContentV1Page[]> {
  if (MODE === "live") { const out: ContentV1Page[] = []; const walk = async (p: string) => { const l = await children(p).catch(() => ({ items: [] as ContentV1Page[] })); for (const it of l.items) { out.push(it); if (it.template === "folder") await walk(it.path); } }; await walk(root); return out; }
  return walkAll().filter((n) => n.path.startsWith(root) && n.path !== root).map(({ kind, children: c, ...rest }) => { void kind; void c; return { ...rest, template: kind === "folder" ? "folder" : rest.template }; });
}
export const isFolder = (p: ContentV1Page) => p.template === "folder" || p.template === "site";
export const mode = MODE;
