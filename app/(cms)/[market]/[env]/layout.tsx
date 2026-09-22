import { TopBar } from "@/components/shell/TopBar";
import { SideNav } from "@/components/shell/SideNav";
import { Palette } from "@/components/shell/Palette";
import { SessionProvider } from "@/components/shell/Session";
import { me } from "@/lib/server/ucp";
import { market } from "@/lib/markets";

export default async function CmsLayout({ children, params }: LayoutProps<"/[market]/[env]">) {
  const { market: mid, env } = await params;
  const user = await me();
  return (
    <SessionProvider user={user} marketRoot={market(mid).root}>
      <div className="cms-shell h-dvh grid grid-rows-[52px_1fr]">
        <TopBar marketId={mid} envId={env} />
        <Palette marketId={mid} envId={env} />
        <div className="grid grid-cols-[auto_1fr] min-h-0">
          <SideNav marketId={mid} envId={env} />
          <main className="overflow-auto min-w-0">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
