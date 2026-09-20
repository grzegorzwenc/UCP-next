import { TopBar } from "@/components/shell/TopBar";
import { SideNav } from "@/components/shell/SideNav";

export default async function CmsLayout({ children, params }: LayoutProps<"/[market]/[env]">) {
  const { market, env } = await params;
  return (
    <div className="h-screen grid grid-rows-[52px_1fr]">
      <TopBar marketId={market} envId={env} />
      <div className="grid grid-cols-[auto_1fr] min-h-0">
        <SideNav marketId={market} envId={env} />
        <main className="overflow-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
