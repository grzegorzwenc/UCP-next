/** UCP runs as three regional instances; every market lives in exactly one of them. */
export type InstanceId = "emea" | "apac" | "na";
export const INSTANCES: { id: InstanceId; name: string; full: string }[] = [
  { id: "emea", name: "EMEA", full: "Europe, Middle East and Africa" },
  { id: "apac", name: "APAC", full: "Asia-Pacific" },
  { id: "na", name: "NA", full: "North America" },
];
export type Market = { id: string; name: string; flag: string; locales: string[]; domain: string; status: string; root: string; instance: InstanceId };
export const MARKETS: Market[] = [
  { id: "uk", name: "HSBC UK", flag: "🇬🇧", locales: ["en-GB", "cy-GB"], domain: "hsbc.co.uk", status: "Live on UCP", root: "/content/uk", instance: "emea" },
  { id: "hk", name: "HSBC Hong Kong", flag: "🇭🇰", locales: ["zh-HK", "en-HK"], domain: "hsbc.com.hk", status: "Validating", root: "/content/hk", instance: "apac" },
  { id: "sg", name: "HSBC Singapore", flag: "🇸🇬", locales: ["en-SG"], domain: "hsbc.com.sg", status: "Pilot", root: "/content/sg", instance: "apac" },
  { id: "fr", name: "HSBC France", flag: "🇫🇷", locales: ["fr-FR"], domain: "hsbc.fr", status: "Live on UCP", root: "/content/fr", instance: "emea" },
  { id: "de", name: "HSBC Germany", flag: "🇩🇪", locales: ["de-DE"], domain: "hsbc.de", status: "On AEM", root: "/content/de", instance: "emea" },
  { id: "mx", name: "HSBC Mexico", flag: "🇲🇽", locales: ["es-MX"], domain: "hsbc.com.mx", status: "Live on UCP", root: "/content/mx", instance: "na" },
  { id: "ae", name: "HSBC UAE", flag: "🇦🇪", locales: ["en-AE", "ar-AE"], domain: "hsbc.ae", status: "Validating", root: "/content/ae", instance: "emea" },
];
/** `note`: what publishing here means, shown wherever the environment is picked. */
export type Env = { id: string; name: string; color: string; note: string };
const NOT_LIVE = "Nothing in this environment reaches customers.";
export const ENVS: Env[] = [
  { id: "dev", name: "Development", color: "#9DA1AC", note: NOT_LIVE },
  { id: "test", name: "Test", color: "#7FAEDD", note: NOT_LIVE },
  { id: "stage", name: "Staging", color: "#E9A23B", note: NOT_LIVE },
  { id: "prod", name: "Production", color: "#3FBDB7", note: "Publishing here goes live for customers." },
];
export const instanceOf = (marketId: string) => INSTANCES.find((i) => i.id === market(marketId).instance) ?? INSTANCES[0];
export const marketsIn = (instance: InstanceId) => MARKETS.filter((m) => m.instance === instance);
export const market = (id: string) => MARKETS.find((m) => m.id === id) ?? MARKETS[0];
export const env = (id: string) => ENVS.find((e) => e.id === id) ?? ENVS[3];
