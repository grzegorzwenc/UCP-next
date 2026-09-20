"use client";
import { useRouter, usePathname } from "next/navigation";
import { MARKETS, ENVS, market, env } from "@/lib/markets";

export function TopBar({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const rest = pathname.split("/").slice(3).join("/") || "dashboard";
  const m = market(marketId), e = env(envId);
  return (
    <header className="h-[52px] flex items-center gap-3 px-4 bg-[#0F1013] text-white">
      <a href={`/${marketId}/${envId}/dashboard`} className="flex items-center gap-2 font-semibold text-sm pr-2 rounded hover:bg-white/10 px-1.5 py-1"><img src="/hsbc-logo-white.svg" alt="" className="h-6" /><span className="w-px h-4 bg-white/25 mx-1" />Content Management</a>
      <label className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-md px-2.5 py-1 text-[13px]">
        <select aria-label="Market" className="bg-transparent font-semibold outline-none" value={m.id} onChange={(ev) => router.push(`/${ev.target.value}/${envId}/${rest}`)}>{MARKETS.map((x) => <option key={x.id} value={x.id} className="text-black">{x.flag} {x.name}</option>)}</select>
      </label>
      <label className="flex items-center gap-1.5 bg-white/10 border rounded-md px-2.5 py-1 text-[13px]" style={{ borderColor: e.color, color: e.color }}>
        <i className="inline-block w-2 h-2 rounded-full" style={{ background: e.color }} />
        <select aria-label="Environment" className="bg-transparent font-semibold outline-none" value={e.id} onChange={(ev) => router.push(`/${marketId}/${ev.target.value}/${rest}`)}>{ENVS.map((x) => <option key={x.id} value={x.id} className="text-black">{x.name}</option>)}</select>
      </label>
      <div className="flex-1 max-w-[460px] flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-1.5 text-[13px] text-white/60"><span>⌕</span><input className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50" placeholder="Search pages, assets, people…" /><kbd className="font-mono text-[10.5px] border border-white/25 rounded px-1">⌘K</kbd></div>
      <div className="ml-auto flex items-center gap-3"><button aria-label="Notifications" className="relative w-4 h-4 border-2 border-white/80 rounded-t-md rounded-b-sm"><i className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-accent" /></button><button aria-label="Account: Jordan Mensah" className="w-7 h-7 rounded-full bg-good grid place-items-center text-[11px] font-semibold">JM</button></div>
    </header>
  );
}
