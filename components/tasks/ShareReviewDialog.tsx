"use client";
import { useEffect, useState } from "react";
import { BdlSelect } from "@/components/ui/BdlSelect";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

const STAGE: Record<string, string> = { draft: "the draft", review: "author's review", bizreview: "business review" };
const abs = (u: string) => `${window.location.origin}${u}`;

/**
 * Share a page that is in review: a link to the review screen (preview + comments) to copy, or an e-mail invite.
 * An e-mail of a UCP user who may review the page also assigns them (the task appears in their My tasks); anyone else
 * can still comment through the link. E-mails open in the sender's own mail app — the prototype sends nothing itself.
 * Site admins can approve straight away (on behalf of the reviewer).
 */
export function ShareReviewDialog({ marketId, path, title, stage, onClose, onApprove, onAccess, inline = false }: { /** render just the controls, for embedding in a panel */ inline?: boolean; marketId: string; path: string; title: string; stage: "draft" | "review" | "bizreview"; onClose: () => void; onApprove?: () => Promise<void> | void; /** someone got the review: a person (by e-mail) or a group */ onAccess?: (a: { person?: string; group?: string }) => void }) {
  const [url, setUrl] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(""); const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  /* business review: give a whole team access (everyone in it sees the page in My tasks; those with Review can sign off) */
  type Group = Awaited<ReturnType<typeof ucpApi.reviewGroups>>[number];
  const [groups, setGroups] = useState<Group[] | null>(null); const [team, setTeam] = useState("");
  useEffect(() => { let live = true; ucpApi.reviewLink(marketId, path).then((r) => live && setUrl(abs(r.url)), (e) => live && setErr(errorText(e))); return () => { live = false; }; }, [marketId, path]);
  useEffect(() => { if (stage === "review") return; let live = true; ucpApi.reviewGroups(marketId, path).then((g) => live && setGroups(g), () => live && setGroups([])); return () => { live = false; }; }, [marketId, path, stage]);
  const shareGroup = async () => {
    if (!team || busy) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.shareWithGroup(marketId, path, team); const n = r.members.length; const sign = r.members.filter((m) => m.canSignOff).length;
      setGroups((gs) => gs && gs.map((g) => (g.team === team ? { ...g, shared: true } : g)).sort((a, b) => Number(b.shared) - Number(a.shared) || a.team.localeCompare(b.team)));
      onAccess?.({ group: team });
      setSent(stage === "draft"
        ? `${team} notified · ${n} ${n === 1 ? "person has" : "people have"} been sent the link.`
        : `${team} notified · ${n} ${n === 1 ? "person" : "people"} now ${n === 1 ? "has" : "have"} access and ${n === 1 ? "sees" : "see"} it in My tasks${sign ? `, ${sign} of them can sign off` : ", but nobody there can sign off"}.`);
      setTeam("");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  /* Addresses become chips as you type a comma (or Enter / semicolon / a space after a complete
     one), so a long list stays readable and any one of them can be taken back out again. */
  const [people, setPeople] = useState<string[]>([]);
  const addPerson = (raw: string) => { const v = raw.trim().replace(/[,;]$/, ""); if (!v) return; setPeople((ps) => (ps.includes(v) ? ps : [...ps, v])); setEmail(""); };
  const onMailKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === ";" || (e.key === "Enter" && email.trim())) { e.preventDefault(); addPerson(email); return; }
    if (e.key === "Enter") { e.preventDefault(); void invite(); return; }
    if (e.key === "Backspace" && !email && people.length) setPeople((ps) => ps.slice(0, -1));
  };
  const withAccess = (groups ?? []).filter((g) => g.shared);
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setErr("Copy did not work · select the link and copy it by hand"); } };
  /* Several addresses at once, separated by commas. Nothing opens the mail app any more: a link is
     made for each person and the panel says who was notified, so sharing with five people is five
     links and one sentence rather than five mail windows. */
  const invite = async () => {
    const list = [...people, ...email.split(/[,;]/).map((x) => x.trim())].filter(Boolean);
    if (!list.length || busy) return; setBusy(true); setErr(null);
    try {
      const done: string[] = []; const assigned: string[] = [];
      for (const to of list) {
        const r = await ucpApi.reviewLink(marketId, path, to);
        done.push(to); if (r.assigned) { assigned.push(r.assigned); onAccess?.({ person: r.assigned }); }
      }
      const who = done.length === 1 ? done[0] : `${done.length} people`;
      setSent(assigned.length
        ? `${who} notified · ${assigned.join(", ")} ${assigned.length === 1 ? "is" : "are"} assigned and ${assigned.length === 1 ? "sees" : "see"} it in My tasks.`
        : `${who} notified · ${done.length === 1 ? "they can" : "they can each"} comment through the link.`);
      setEmail(""); setPeople([]);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  /* `inline`: the workflow drawer renders these controls in place, so the chrome is dropped and
     the approve action (which belongs to the dialog's footer) is not offered there. */
  /* One body, two frames: the dialog for the page's own Share action, and `inline` for the
     workflow drawer, which shows the same controls in place rather than stacking a modal. */
  const body = <>
    {stage === "draft" && <p className="mb-3 text-sm text-ink-2">Let the business see the first version early. They open the draft, click a text or an image and comment. Nobody is assigned and nobody signs off.</p>}
    <label className="block text-xs font-medium text-ink-2">{stage === "draft" ? "Draft link" : "Review link"}</label>
    <div className="mt-1 flex gap-2"><input readOnly value={url ?? "Creating the link…"} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-xs bg-surface-2" aria-label="Review link" />
      <button className="btn btn-sm btn-secondary" disabled={!url} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button></div>
    <p className="text-xs text-ink-3 mt-1">{stage === "draft" ? "Anyone with the link sees the latest saved draft and can comment until the page is sent for review." : <>Anyone with the link can comment until the {STAGE[stage]} ends.{stage === "bizreview" ? " Only people you e-mail or a group can sign off." : ""}</>}</p>
    <label className="block text-xs font-medium text-ink-2 mt-4" htmlFor="rv-mail">Send by e-mail</label>
    {people.length > 0 && <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="People to notify">{people.map((x) => <li key={x}>
      <span className="inline-flex items-center gap-1 border border-line-2 bg-surface-2 px-2 py-0.5 text-xs text-ink">{x}
        <button type="button" aria-label={`Remove ${x}`} title={`Remove ${x}`} className="-me-0.5 grid h-4 w-4 place-items-center text-ink-3 hover:text-crit" onClick={() => setPeople((ps) => ps.filter((y) => y !== x))}>
          <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button></span></li>)}</ul>}
    <div className="mt-1.5 flex gap-2"><input id="rv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onMailKey} onBlur={() => addPerson(email)} placeholder={people.length ? "Add another…" : "name@hsbc.com"} className="bdl-field min-w-0 flex-1" />
      <button className="btn btn-sm btn-secondary" disabled={(!email.trim() && !people.length) || busy} onClick={invite}>Send e-mail</button></div>
    <p className="text-xs text-ink-3 mt-1">A comma makes each address a chip.{stage === "draft" ? "" : " A UCP reviewer is also assigned."}</p>
    {stage !== "review" && <>
      <label className="block text-xs font-medium text-ink-2 mt-4" htmlFor="rv-group">Share with a group</label>
      {/* the app's BDL dropdown, so the list is BDL open as well as shut (components/ui/BdlSelect) */}
      <div className="mt-1 flex gap-2"><BdlSelect id="rv-group" className="min-w-0 flex-1" value={team} onValueChange={setTeam} disabled={!groups}
          placeholder={groups ? "Choose a group…" : "Loading groups…"}
          options={(groups ?? []).map((g) => ({ value: g.team, label: g.team, hint: `${g.members.length} ${g.members.length === 1 ? "person" : "people"}${g.shared ? " · has access" : ""}`, disabled: g.shared }))} />
        <button className="btn btn-sm btn-secondary" disabled={!team || busy} onClick={shareGroup}>{stage === "draft" ? "Send the link" : "Give access"}</button></div>
      <p className="text-xs text-ink-3 mt-1">{stage === "draft" ? "Everyone in the group gets the link by e-mail." : "The whole group sees it in My tasks."}</p>
      {withAccess.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Groups with access">{withAccess.map((g) => <span key={g.team} className="inline-flex items-center gap-1 text-xs bg-info-soft text-info rounded-full px-2.5 py-0.5" title={g.members.map((m) => m.name).join(", ")}><svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 13.8c1.8.6 3 2.4 3 5.2" /></svg>{g.team} · {g.members.length}</span>)}</div>}
    </>}
    {sent && <p role="status" className="text-xs bg-good-soft text-good rounded-md px-3 py-2 mt-3">✓ {sent}</p>}
    <Err err={err} />
  </>;

  if (inline) return <div className="flex flex-col">{body}</div>;

  return <ModalShell title={stage === "draft" ? "Share the draft with the business" : `Share for ${STAGE[stage]}`} subtitle={<b className="text-ink-2">{title}</b>} width={540} onClose={onClose}
    footer={<>{onApprove && <button className="btn btn-sm btn-secondary mr-auto" disabled={busy} onClick={async () => { onClose(); await onApprove(); /* the next stage opens its own share dialog */ }} title="Site admin: approve on behalf of the reviewer">{stage === "review" ? "Mark reviewed now" : "Sign off now"}</button>}<button className="btn btn-sm btn-primary" onClick={onClose}>Done</button></>}>
    {body}
  </ModalShell>;
}
