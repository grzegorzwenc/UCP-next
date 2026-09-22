"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/ucp/types";
import { ROLES, SSO_USER } from "@/lib/ucp/seed";
import { ucpApi } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { errorText } from "@/lib/api/errors";

/**
 * Sign-in. "Sign in with company SSO" is the real path (today it signs in the platform super admin;
 * swap `ucpApi.login(SSO_USER)` for the SSO redirect when the identity provider is connected).
 * Demo accounts (other roles) are only listed on /login?demo=1 so permission scenarios can still be shown.
 */
export function Login({ users, next, demo }: { users: User[]; next: string; demo?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const sso = users.find((u) => u.id === SSO_USER) ?? users.find((u) => u.role === "admin") ?? users[0];
  async function signIn(u: User) {
    setBusy(u.id); setErr(null);
    try { await ucpApi.login(u.id); router.push(next); router.refresh(); }
    catch (e) { setErr(errorText(e)); setBusy(null); }
  }
  return (
    <main className="min-h-dvh bg-[#0F1013] text-white flex flex-col items-center justify-center px-4 py-10" style={{ backgroundImage: "radial-gradient(1200px 600px at 50% -10%, rgba(219,0,17,.18), transparent 60%)" }}>
      <div className="w-[min(440px,100%)] flex flex-col items-center text-center">
        <img src="/hsbc-logo-white.svg" alt="HSBC" className="h-12 mb-8" />
        <h1 className="text-[28px] font-semibold leading-tight">Unified Content Management</h1>
        <p className="text-[14px] text-white/60 mt-2">One place to author and publish for every HSBC market</p>

        <button type="button" onClick={() => sso && void signIn(sso)} disabled={!!busy || !sso} className="mt-10 w-full h-12 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2.5 disabled:opacity-60 transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6zM9 12l2 2 4-4" /></svg>
          {busy === sso?.id ? "Signing in…" : "Sign in with company SSO"}
        </button>
        {demo && <ul className="mt-8 w-full grid gap-1.5 text-left" aria-label="Demo accounts">{users.filter((u) => u.id !== SSO_USER).map((u) => (
          <li key={u.id}><button type="button" onClick={() => void signIn(u)} disabled={!!busy} className="w-full flex items-center gap-3 border border-white/12 bg-white/[.04] hover:bg-white/[.09] rounded-lg px-3 py-2.5 disabled:opacity-60">
            <Avatar name={u.name} size={32} /><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-medium truncate">{u.name}</span><small className="block text-white/50 text-[11.5px] truncate">{ROLES[u.role]?.name ?? u.role} · {u.team}</small></span>
            <span className="text-[12px] text-white/60">{busy === u.id ? "Signing in…" : "Sign in →"}</span></button></li>))}</ul>}
        {err && <div role="alert" className="mt-4 w-full text-[12.5px] bg-crit/20 border border-crit/40 text-white px-3 py-2 rounded">{err}</div>}
      </div>
      <p className="text-[12px] text-white/35 mt-12">Nothing here reaches customers until you publish. © HSBC Group</p>
    </main>
  );
}
