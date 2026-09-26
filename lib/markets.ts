/**
 * Markets (sites) and environments. Client-safe: no backend access here.
 *
 * On the mock backend the market list is the fixed demo list below. On a real backend it comes from the backend
 * (ContentLIBRE: its configured sites, lib/server/markets.ts) and reaches client components through
 * MarketsProvider (components/shell/Markets.tsx), so nothing outside the mock may treat MOCK_MARKETS as the truth.
 */
export type Market = { id: string; name: string; flag: string; locales: string[]; domain: string; status: string; root: string };
export const MOCK_MARKETS: Market[] = [
  { id: "uk", name: "HSBC UK", flag: "🇬🇧", locales: ["en-GB", "cy-GB"], domain: "hsbc.co.uk", status: "Live on UCP", root: "/content/uk" },
  { id: "hk", name: "HSBC Hong Kong", flag: "🇭🇰", locales: ["zh-HK", "en-HK"], domain: "hsbc.com.hk", status: "Validating", root: "/content/hk" },
  { id: "sg", name: "HSBC Singapore", flag: "🇸🇬", locales: ["en-SG"], domain: "hsbc.com.sg", status: "Pilot", root: "/content/sg" },
  { id: "fr", name: "HSBC France", flag: "🇫🇷", locales: ["fr-FR"], domain: "hsbc.fr", status: "Live on UCP", root: "/content/fr" },
  { id: "de", name: "HSBC Germany", flag: "🇩🇪", locales: ["de-DE"], domain: "hsbc.de", status: "On AEM", root: "/content/de" },
  { id: "mx", name: "HSBC Mexico", flag: "🇲🇽", locales: ["es-MX"], domain: "hsbc.com.mx", status: "Live on UCP", root: "/content/mx" },
  { id: "ae", name: "HSBC UAE", flag: "🇦🇪", locales: ["en-AE", "ar-AE"], domain: "hsbc.ae", status: "Validating", root: "/content/ae" },
];
export type Env = { id: string; name: string; color: string };
export const ENVS: Env[] = [
  { id: "dev", name: "Development", color: "#9DA1AC" },
  { id: "test", name: "Test", color: "#7FAEDD" },
  { id: "stage", name: "Staging", color: "#E9A23B" },
  { id: "prod", name: "Production", color: "#3FBDB7" },
];
/** The market with `id`, else the first one, else a placeholder named after `id` (a backend still starting up has no sites yet). */
export const pickMarket = (markets: Market[], id: string): Market =>
  markets.find((m) => m.id === id) ?? markets[0] ?? { id, name: id, flag: "", locales: [], domain: "", status: "", root: `/content/${id}` };
export const env = (id: string) => ENVS.find((e) => e.id === id) ?? ENVS[3];
