import { redirect } from "next/navigation";
import { getMarkets } from "@/lib/server/markets";
import { RepoError } from "@/lib/repo";

/** The first market's dashboard; the market list is the backend's (ContentLIBRE: its sites). */
export default async function Home() {
  let first: string | undefined;
  try { first = (await getMarkets())[0]?.id; }
  catch (e) { if (e instanceof RepoError && e.status === 401) redirect("/login"); throw e; }
  redirect(`/${first ?? "uk"}/prod/dashboard`);
}
