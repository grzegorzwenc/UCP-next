"use client";
import { useEffect, useState } from "react";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

const STAGE: Record<string, string> = { review: "author's review", bizreview: "business review" };
const abs = (u: string) => `${window.location.origin}${u}`;

/**
 * Share a page that is in review: a link to the review screen (preview + comments) to copy, or an e-mail invite.
 * An e-mail of a UCP user who may review the page also assigns them (the task appears in their My tasks); anyone else
 * can still comment through the link. E-mails open in the sender's own mail app — the prototype sends nothing itself.
 * Site admins can approve straight away (on behalf of the reviewer).
 */
export function ShareReviewDialog({ marketId, path, title, stage, onClose, onApprove, onAccess }: { marketId: string; path: string; title: string; stage: "review" | "bizreview"; onClose: () => void; onApprove?: () => Promise<void> | void; /** someone got the review: a person (by e-mail) or a group */ onAccess?: (a: { person?: string; group?: string }) => void }) {
  const [url, setUrl] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(""); const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  /* business review: give a whole team access (everyone in it sees the page in My tasks; those with Review can sign off) */
  type Group = Awaited<ReturnType<typeof ucpApi.reviewGroups>>[number];
  const [groups, setGroups] = useState<Group[] | null>(null); const [team, setTeam] = useState("");
  useEffect(() => { let live = true; ucpApi.reviewLink(marketId, path).then((r) => live && setUrl(abs(r.url)), (e) => live && setErr(errorText(e))); return () => { live = false; }; }, [marketId, path]);
  useEffect(() => { if (stage !== "bizreview") return; let live = true; ucpApi.reviewGroups(marketId, path).then((g) => live && setGroups(g), () => live && setGroups([])); return () => { live = false; }; }, [marketId, path, stage]);
  const shareGroup = async () => {
    if (!team || busy) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.shareWithGroup(marketId, path, team); const link = abs(r.url); const n = r.members.length; const sign = r.members.filter((m) => m.canSignOff).length;
      setGroups((gs) => gs && gs.map((g) => (g.team === team ? { ...g, shared: true } : g)).sort((a, b) => Number(b.shared) - Number(a.shared) || a.team.localeCompare(b.team)));
      const to = r.members.map((m) => m.email).filter(Boolean).join(","); const subject = `Please review: ${title}`; const body = `Hi ${team},\n\n${title} is ready for business review. Anyone in the group can see the page and leave comments here:\n${link}\n\nThank you!`;
      if (to) window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      onAccess?.({ group: team }); setSent(`${team} (${n} ${n === 1 ? "person" : "people"}) now has access · it shows in their My tasks${sign ? `, ${sign} of them can sign off` : ", but nobody there can sign off"}.`); setTeam("");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const withAccess = (groups ?? []).filter((g) => g.shared);
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setErr("Copy did not work · select the link and copy it by hand"); } };
  const invite = async () => {
    const to = email.trim(); if (!to || busy) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.reviewLink(marketId, path, to); const link = abs(r.url);
      const subject = `Please review: ${title}`; const body = `Hi,\n\n${title} is ready for ${STAGE[stage]}. You can see the page and leave comments here:\n${link}\n\nThank you!`;
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setSent(r.assigned ? `${r.assigned} is now assigned and sees it in My tasks.` : `${to} can comment through the link.`); setEmail(""); if (r.assigned) onAccess?.({ person: r.assigned });
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return <ModalShell title={`Share for ${STAGE[stage]}`} subtitle={<><b className="text-ink-2">{title}</b> · reviewers see the page and can leave comments, which show up in the page builder</>} width={540} onClose={onClose}
    footer={<>{onApprove && <button className="btn mr-auto" disabled={busy} onClick={async () => { onClose(); await onApprove(); /* the next stage opens its own share dialog */ }} title="Site admin: approve on behalf of the reviewer">{stage === "review" ? "Mark reviewed now" : "Sign off now"}</button>}<button className="btn btn-primary" onClick={onClose}>Done</button></>}>
    <label className="block text-[12.5px] font-semibold text-ink-2">Review link</label>
    <div className="mt-1 flex gap-2"><input readOnly value={url ?? "Creating the link…"} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-mono bg-surface-2" aria-label="Review link" />
      <button className="btn btn-sm" disabled={!url} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button></div>
    <p className="text-[11.5px] text-ink-3 mt-1">Works until the {STAGE[stage]} is finished. Anyone with the link can see the page and comment.</p>
    <label className="block text-[12.5px] font-semibold text-ink-2 mt-4" htmlFor="rv-mail">Send by e-mail</label>
    <div className="mt-1 flex gap-2"><input id="rv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void invite(); }} placeholder="name@hsbc.com" className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" />
      <button className="btn btn-sm" disabled={!email.trim() || busy} onClick={invite}>Send e-mail</button></div>
    <p className="text-[11.5px] text-ink-3 mt-1">Opens your mail app with the link. A UCP reviewer&apos;s address also assigns them, so it appears in their My tasks.</p>
    {stage === "bizreview" && <>
      <label className="block text-[12.5px] font-semibold text-ink-2 mt-4" htmlFor="rv-group">Share with a group</label>
      <div className="mt-1 flex gap-2"><select id="rv-group" value={team} onChange={(e) => setTeam(e.target.value)} disabled={!groups} className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface">
          <option value="">{groups ? "Choose a group…" : "Loading groups…"}</option>
          {(groups ?? []).map((g) => <option key={g.team} value={g.team} disabled={g.shared}>{g.team} · {g.members.length} {g.members.length === 1 ? "person" : "people"}{g.shared ? " · has access" : ""}</option>)}
        </select>
        <button className="btn btn-sm" disabled={!team || busy} onClick={shareGroup}>Give access</button></div>
      <p className="text-[11.5px] text-ink-3 mt-1">Everyone in the group sees the page in My tasks and can comment; people with Review &amp; approve can sign it off. Opens your mail app addressed to the whole group.</p>
      {withAccess.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Groups with access">{withAccess.map((g) => <span key={g.team} className="inline-flex items-center gap-1 text-[12px] bg-info-soft text-info rounded-full px-2.5 py-0.5" title={g.members.map((m) => m.name).join(", ")}><svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 13.8c1.8.6 3 2.4 3 5.2" /></svg>{g.team} · {g.members.length}</span>)}</div>}
    </>}
    {sent && <p role="status" className="text-[12.5px] bg-good-soft text-good rounded-md px-3 py-2 mt-3">✓ {sent}</p>}
    <Err err={err} />
  </ModalShell>;
}
