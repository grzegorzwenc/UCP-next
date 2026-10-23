import { cookies } from "next/headers";
import { TopBar } from "@/components/shell/TopBar";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { Palette } from "@/components/shell/Palette";
import { SessionProvider } from "@/components/shell/Session";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { me, publishDue } from "@/lib/server/ucp";
import { market } from "@/lib/markets";

export default async function CmsLayout({ children, params }: LayoutProps<"/[market]/[env]">) {
  const { market: mid, env } = await params;
  const [user, jar] = await Promise.all([me(), cookies(), publishDue(mid).catch(() => 0)]); // scheduled pages whose time has come go live
  /* The sidebar remembers collapsed/expanded in a cookie; reading it on the server means
     the first paint matches, instead of flashing open and then collapsing. */
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";
  return (
    <SessionProvider user={user} marketRoot={market(mid).root}><ConfirmProvider>
      {/* the sidebar's collapsed-rail tooltips and the environment tooltip need it */}
      <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen} className="cms-shell h-dvh">
        <AppSidebar marketId={mid} envId={env} />
        <SidebarInset className="min-w-0 grid grid-rows-[auto_1fr] overflow-hidden">
          <TopBar marketId={mid} envId={env} />
          <Palette marketId={mid} envId={env} />
          <div data-scroll-root className="overflow-auto min-w-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      </TooltipProvider>
    </ConfirmProvider></SessionProvider>
  );
}
