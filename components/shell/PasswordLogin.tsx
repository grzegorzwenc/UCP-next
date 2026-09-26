"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

/**
 * Sign-in against a real backend (ContentLIBRE): user name and password, checked by the backend itself.
 * The BFF keeps the backend session in an httpOnly cookie; nothing here stores a credential.
 */
export function PasswordLogin({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(ev: React.FormEvent) {
    ev.preventDefault(); setBusy(true); setErr(null);
    try { await ucpApi.signIn(username.trim(), password); router.push(next); router.refresh(); }
    catch (e) { setErr(errorText(e)); setBusy(false); setPassword(""); }
  }
  const input = "mt-1 w-full h-11 rounded-lg bg-white/[.06] border border-white/15 px-3 text-[15px] text-white outline-none focus:border-white/50";
  return (
    <main className="min-h-dvh bg-[#0F1013] text-white flex flex-col items-center justify-center px-4 py-10">
      <form onSubmit={(e) => void submit(e)} className="w-[min(400px,100%)] flex flex-col text-left">
        <h1 className="text-[28px] font-semibold leading-tight text-center">Content Management</h1>
        <p className="text-[14px] text-white/60 mt-2 mb-8 text-center">Sign in with your ContentLIBRE account</p>
        <label className="text-[13px] text-white/70">User name<input className={input} name="username" autoComplete="username" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label className="text-[13px] text-white/70 mt-4">Password<input className={input} name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button type="submit" disabled={busy} className="mt-6 h-12 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-[15px] disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
        {err && <div role="alert" className="mt-4 text-[12.5px] bg-crit/20 border border-crit/40 text-white px-3 py-2 rounded">{err}</div>}
      </form>
    </main>
  );
}
