import type { Block } from "@/lib/api/types";
import type { ComponentNode, RepoNode, PageView, PageSummary } from "./types";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";

/** sling:resourceType namespace for the HSBC block library. */
export const RT_PREFIX = "hsbc/components/";
export const rtOf = (blockType: string) => RT_PREFIX + blockType;
export const blockTypeOf = (resourceType: string) => resourceType.startsWith(RT_PREFIX) ? resourceType.slice(RT_PREFIX.length) : resourceType;

/** Builder blocks ⇄ component nodes (what ends up under jcr:content/root in the repository). */
export const blocksToComponents = (blocks: Block[]): ComponentNode[] =>
  blocks.map((b, i) => ({ name: `${b.type}_${b.id}`.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || `c${i}`, resourceType: rtOf(b.type), props: { ...b.props, "ucp:id": b.id } }));

export const componentsToBlocks = (components: ComponentNode[]): Block[] =>
  components.filter((c) => BLOCK_BY_TYPE[blockTypeOf(c.resourceType)]).map((c, i) => {
    const { "ucp:id": id, ...props } = c.props as Record<string, unknown>;
    return { id: String(id ?? c.name ?? i), type: blockTypeOf(c.resourceType), props };
  });

/** Node tree (cq:Page → jcr:content → root → components) ⇄ PageView. Used by the Sling and mock adapters. */
export function nodeToPage(node: RepoNode): PageView {
  const content = node.children?.find((c) => c.name === "jcr:content");
  const p = content?.properties ?? {};
  const root = content?.children?.find((c) => c.name === "root");
  const components: ComponentNode[] = (root?.children ?? []).map((c) => ({ name: c.name, resourceType: String(c.properties["sling:resourceType"] ?? ""), props: Object.fromEntries(Object.entries(c.properties).filter(([k]) => !k.startsWith("jcr:") && k !== "sling:resourceType")) }));
  return {
    path: node.path, name: node.name,
    title: String(p["jcr:title"] ?? node.name), description: p["jcr:description"] as string | undefined, navTitle: p["navTitle"] as string | undefined, hideInNav: p["hideInNav"] as boolean | undefined,
    template: (p["cq:template"] as string | undefined)?.split("/").pop(), locale: p["jcr:language"] as string | undefined, resourceType: p["sling:resourceType"] as string | undefined,
    status: (p["ucp:status"] as PageView["status"]) ?? "draft",
    created: p["jcr:created"] as string | undefined, lastModified: p["cq:lastModified"] as string | undefined ?? (p["jcr:lastModified"] as string | undefined), lastModifiedBy: p["cq:lastModifiedBy"] as string | undefined,
    meta: p,
    components,
  };
}
export function nodeToSummary(node: RepoNode): PageSummary {
  const v = nodeToPage(node); const { components, ...rest } = v; void components;
  const rt = String(v.resourceType ?? ""); const isFolder = node.primaryType !== "cq:Page" || !node.children?.some((c) => c.name === "jcr:content") || rt.endsWith("/folder") || rt.endsWith("/site");
  return { ...rest, isFolder, childCount: (node.children ?? []).filter((c) => c.name !== "jcr:content").length };
}
export function pageToNode(page: PageView): RepoNode {
  return { path: page.path, name: page.name, primaryType: "cq:Page", properties: {}, children: [
    { path: `${page.path}/jcr:content`, name: "jcr:content", primaryType: "cq:PageContent", properties: { ...(page.meta ?? {}), "jcr:title": page.title, "jcr:description": page.description, navTitle: page.navTitle, hideInNav: page.hideInNav, "cq:template": page.template ? `/conf/hsbc/settings/wcm/templates/${page.template}` : undefined, "jcr:language": page.locale, "sling:resourceType": page.resourceType ?? "hsbc/components/page", "ucp:status": page.status, "jcr:created": page.created, "cq:lastModified": page.lastModified, "cq:lastModifiedBy": page.lastModifiedBy },
      children: [{ path: `${page.path}/jcr:content/root`, name: "root", primaryType: "nt:unstructured", properties: { "sling:resourceType": "hsbc/components/container" },
        children: page.components.map((c) => ({ path: `${page.path}/jcr:content/root/${c.name}`, name: c.name, primaryType: "nt:unstructured", properties: { "sling:resourceType": c.resourceType, ...c.props } })) }] } ] };
}
