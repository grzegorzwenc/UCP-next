"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/ucp/types";
import { ROLES, SSO_USER, AUTHOR_USER } from "@/lib/ucp/seed";
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
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null); const [picker, setPicker] = useState(false);
  const sso = users.find((u) => u.id === SSO_USER) ?? users.find((u) => u.role === "admin") ?? users[0];
  const author = users.find((u) => u.id === AUTHOR_USER) ?? users.find((u) => u.role === "author");
  async function signIn(u: User) {
    setBusy(u.id); setErr(null);
    try { await ucpApi.login(u.id); router.push(next); router.refresh(); }
    catch (e) { setErr(errorText(e)); setBusy(null); }
  }
  return (
    <main className="min-h-dvh bg-[#0F1013] text-white flex flex-col items-center px-4 pt-10 pb-8" style={{ backgroundImage: "radial-gradient(1200px 600px at 50% -10%, rgba(219,0,17,.18), transparent 60%)" }}>
      <div className="w-[min(440px,100%)] flex flex-col items-center text-center my-auto">
        <img src="/hsbc-logo-white.svg" alt="HSBC" className="h-12 mb-8" />
        <h1 className="text-[28px] font-semibold leading-tight">Unified Content Management</h1>
        <p className="text-[14px] text-white/60 mt-2">One place to author and publish for every HSBC market</p>

        {!picker ? <>
          <button type="button" onClick={() => { setErr(null); setPicker(true); }} className="mt-10 w-full h-12 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2.5 transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6zM9 12l2 2 4-4" /></svg>
            Sign in with company SSO
          </button>
        </> : (
          /* SSO account picker (stand-in for the identity provider's own screen) */
          <div role="dialog" aria-label="Choose an account" className="mt-10 w-full bg-white text-ink rounded-xl shadow-2xl text-left overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-line flex items-start gap-3">
              <div className="flex-1"><b className="block text-[15px]">Choose an account</b><small className="block text-ink-3 text-[12.5px] mt-0.5">to continue to Unified Content Management</small></div>
              <button type="button" onClick={() => setPicker(false)} disabled={!!busy} className="w-7 h-7 rounded text-ink-3 hover:bg-surface-3" aria-label="Back">✕</button>
            </div>
            <ul className="py-1">{[author, sso].filter((u): u is User => !!u).map((u) => (
              <li key={u.id}><button type="button" onClick={() => void signIn(u)} disabled={!!busy} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-2 disabled:opacity-60">
                <Avatar name={u.name} size={36} />
                <span className="flex-1 min-w-0"><b className="block text-[14px] truncate">{u.id === SSO_USER ? "Super admin" : "User"}{u.name !== "Super admin" && <span className="font-normal text-ink-3"> · {u.name}</span>}</b><small className="block text-ink-3 text-[12px] truncate">{u.email}</small><small className="block text-ink-3 text-[11.5px] truncate">{u.id === SSO_USER ? "Sees every user, page and setting" : "Sees only their own pages and tasks"}</small></span>
                <span className="text-[12px] text-ink-3">{busy === u.id ? "Signing in…" : "›"}</span>
              </button></li>))}</ul>
            <div className="px-5 py-2.5 border-t border-line text-[11.5px] text-ink-3">HSBC single sign-on · {ROLES.admin.name} and {ROLES.author.name} demo accounts</div>
          </div>
        )}
        {demo && <ul className="mt-8 w-full grid gap-1.5 text-left" aria-label="Demo accounts">{users.filter((u) => u.id !== SSO_USER && u.id !== AUTHOR_USER).map((u) => (
          <li key={u.id}><button type="button" onClick={() => void signIn(u)} disabled={!!busy} className="w-full flex items-center gap-3 border border-white/12 bg-white/[.04] hover:bg-white/[.09] rounded-lg px-3 py-2.5 disabled:opacity-60">
            <Avatar name={u.name} size={32} /><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-medium truncate">{u.name}</span><small className="block text-white/50 text-[11.5px] truncate">{ROLES[u.role]?.name ?? u.role} · {u.team}</small></span>
            <span className="text-[12px] text-white/60">{busy === u.id ? "Signing in…" : "Sign in →"}</span></button></li>))}</ul>}
        {err && <div role="alert" className="mt-4 w-full text-[12.5px] bg-crit/20 border border-crit/40 text-white px-3 py-2 rounded">{err}</div>}
      </div>
      <footer role="note" className="mt-10 w-[min(560px,100%)] border-t border-white/10 pt-5 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[.14em] uppercase text-[#F5B544]"><span className="w-1.5 h-1.5 rounded-full bg-[#F5B544]" aria-hidden />Test · Clickable mockup</div>
        <p className="text-[12.5px] text-white/45 mt-2 leading-relaxed">A prototype to try the authoring flow. Data is sample content and may reset at any time.<br />Nothing here reaches customers until you publish.</p>
      </footer>
    </main>
  );
}
