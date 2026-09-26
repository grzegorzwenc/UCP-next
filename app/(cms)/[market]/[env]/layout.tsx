import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { SideNav } from "@/components/shell/SideNav";
import { Palette } from "@/components/shell/Palette";
import { SessionProvider } from "@/components/shell/Session";
import { MarketsProvider } from "@/components/shell/Markets";
import { me } from "@/lib/server/ucp";
import { getMarkets } from "@/lib/server/markets";
import { pickMarket } from "@/lib/markets";
import { RepoError, repo } from "@/lib/repo";

export default async function CmsLayout({ children, params }: LayoutProps<"/[market]/[env]">) {
  const { market: mid, env } = await params;
  let user, markets;
  try { [user, markets] = await Promise.all([me(), getMarkets()]); }
  catch (e) {
    // The backend session ended (expired, signed out elsewhere, server restarted): sign in again.
    if (e instanceof RepoError && e.status === 401) redirect(`/login?next=${encodeURIComponent(`/${mid}/${env}/dashboard`)}`);
    throw e;
  }
  return (
    <MarketsProvider markets={markets}>
    <SessionProvider user={user} marketRoot={pickMarket(markets, mid).root}>
      <div className="cms-shell h-dvh grid grid-rows-[52px_1fr]">
        <TopBar marketId={mid} envId={env} envLocked={repo().kind !== "mock"} />
        <Palette marketId={mid} envId={env} />
        <div className="grid grid-cols-[auto_1fr] min-h-0">
          <SideNav marketId={mid} envId={env} />
          <main className="overflow-auto min-w-0">{children}</main>
        </div>
      </div>
    </SessionProvider>
    </MarketsProvider>
  );
}
