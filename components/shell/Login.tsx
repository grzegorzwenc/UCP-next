"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/ucp/types";
import { ROLES } from "@/lib/ucp/seed";
import { ucpApi } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { errorText } from "@/lib/api/errors";

/** SSO stand-in: pick who you are (or type your work email) and you are signed in with that user's permissions. */
export function Login({ users, next }: { users: User[]; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const byEmail = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() || u.id === email.trim().toLowerCase());
  async function signIn(u: User) {
    setBusy(u.id); setErr(null);
    try { await ucpApi.login(u.id); router.push(next); router.refresh(); }
    catch (e) { setErr(errorText(e)); setBusy(null); }
  }
  return (
    <main className="min-h-screen bg-bg grid place-items-center p-6">
      <div className="w-[min(560px,100%)]">
        <div className="bg-surface border border-line rounded-xl shadow-sm p-8">
          <img src="/hsbc-logo.svg" alt="HSBC" className="h-7 mb-6" />
          <h1 className="text-2xl font-semibold">HSBC Content Management</h1>
          <p className="text-[13.5px] text-ink-3 mt-1">Sign in with your company account</p>

          <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (byEmail) void signIn(byEmail); else setErr("No account matches that email. Pick a person below instead."); }}>
            <label className="text-xs text-ink-3 block">Work email
              <input type="email" autoComplete="username" className="mt-1 w-full border border-line-2 rounded-md px-3 py-2 text-[14px] text-ink" placeholder="firstname.lastname@hsbc.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} /></label>
            <button type="submit" className="btn btn-primary w-full justify-center mt-3" disabled={!email.trim() || !!busy}>{busy && byEmail && busy === byEmail.id ? "Signing in…" : "Sign in"}</button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[11.5px] uppercase tracking-[.08em] text-ink-3"><span className="flex-1 h-px bg-line" />Choose who you are (SSO stand-in)<span className="flex-1 h-px bg-line" /></div>
          <ul className="grid gap-1.5">{users.map((u) => (
            <li key={u.id}><button type="button" onClick={() => void signIn(u)} disabled={!!busy} className="w-full flex items-center gap-3 text-left border border-line rounded-lg px-3 py-2.5 hover:border-ink-4 hover:bg-surface-2 disabled:opacity-60">
              <Avatar name={u.name} size={34} /><span className="flex-1 min-w-0"><span className="block text-[14px] font-medium text-ink truncate">{u.name}</span><small className="block text-ink-3 text-[12px] truncate">{ROLES[u.role]?.name ?? u.role} · {u.team}</small></span>
              <span className="btn btn-sm">{busy === u.id ? "Signing in…" : "Sign in"}</span></button></li>))}</ul>
          {err && <div role="alert" className="mt-4 text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
        </div>
        <p className="text-center text-[12.5px] text-ink-3 mt-5">Nothing here reaches customers until you publish.</p>
      </div>
    </main>
  );
}
