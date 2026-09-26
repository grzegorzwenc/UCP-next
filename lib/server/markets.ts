import "server-only";
import { cache } from "react";
import { repo } from "@/lib/repo";
import { MOCK_MARKETS, pickMarket, type Market } from "@/lib/markets";
import { listSites, type ClSite } from "@/lib/server/contentlibre";

const hostOf = (url: string) => { try { return new URL(url).host; } catch { return url; } };

/** A ContentLIBRE site as a market: its locales, the canonical binding's host, and the folder its locale roots share. */
export function siteToMarket(site: ClSite): Market {
  const primary = site.locales.find((l) => l.canonical) ?? site.locales[0];
  return {
    id: site.id,
    name: site.id.charAt(0).toUpperCase() + site.id.slice(1),
    flag: "🌐",
    locales: site.locales.map((l) => l.locale ?? l.binding),
    domain: primary ? hostOf(primary.publicUrl) : "",
    status: "Live",
    root: site.root ?? primary?.contentRoot ?? `/content/${site.id}`,
  };
}

/** Every market the backend knows. Memoised per request: layouts, pages and the shell all ask. */
export const getMarkets = cache(async (): Promise<Market[]> => {
  if (repo().kind !== "contentlibre") return MOCK_MARKETS;
  const { items } = await listSites();
  return items.map(siteToMarket);
});

export async function getMarket(id: string): Promise<Market> { return pickMarket(await getMarkets(), id); }
