"use client";
import { useEffect, useState } from "react";
import { BdlMultiSelect } from "@/components/ui/BdlSelect";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { FloatingPanel } from "@/components/review/FloatingPanel";
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
type Shared = { marketId: string; path: string; title: string; stage: "draft" | "review" | "bizreview"; onClose: () => void;
  /** Hand the page back to its author instead of sending it on; shown as "Go back". */ onSendBack?: () => void;
  /** someone got the review: a person (by e-mail) or a group */ onAccess?: (a: { person?: string; group?: string }) => void };

/** The share form itself, shared by the dialog, the workflow drawer and the floating panel. */
function useShare({ marketId, path, stage, onAccess }: Omit<Shared, "onClose" | "title">) {
  const [url, setUrl] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(""); const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  /* business review: give a whole team access (everyone in it sees the page in My tasks; those with Review can sign off) */
  type Group = Awaited<ReturnType<typeof ucpApi.reviewGroups>>[number];
  const [groups, setGroups] = useState<Group[] | null>(null); const [teams, setTeams] = useState<string[]>([]);
  useEffect(() => { let live = true; ucpApi.reviewLink(marketId, path).then((r) => live && setUrl(abs(r.url)), (e) => live && setErr(errorText(e))); return () => { live = false; }; }, [marketId, path]);
  useEffect(() => { if (stage === "review") return; let live = true; ucpApi.reviewGroups(marketId, path).then((g) => live && setGroups(g), () => live && setGroups([])); return () => { live = false; }; }, [marketId, path, stage]);
  /* Addresses become chips as you type a comma (or Enter / semicolon / a space after a complete
     one), so a long list stays readable and any one of them can be taken back out again. */
  const [people, setPeople] = useState<string[]>([]);
  const addPerson = (raw: string) => { const v = raw.trim().replace(/[,;]$/, ""); if (!v) return; setPeople((ps) => (ps.includes(v) ? ps : [...ps, v])); setEmail(""); };
  const onMailKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === ";" || (e.key === "Enter" && email.trim())) { e.preventDefault(); addPerson(email); return; }
    if (e.key === "Enter") { e.preventDefault(); void sendAll(); return; }
    if (e.key === "Backspace" && !email && people.length) setPeople((ps) => ps.slice(0, -1));
  };
  const [note, setNote] = useState("");
  /** Everyone named gets told in one go, and the note (if there is one) goes on the page where
   *  they will read it, so the ask and the reason arrive together. */
  const sendAll = async () => {
    const list = [...people, ...email.split(/[,;]/).map((x) => x.trim())].filter(Boolean);
    if ((!list.length && !teams.length) || busy) return;
    setBusy(true); setErr(null);
    try {
      const said: string[] = [];
      if (note.trim()) await ucpApi.addComment(marketId, path, note.trim());
      const [, grps] = await Promise.all([
        (async () => { for (const to of list) { const r = await ucpApi.reviewLink(marketId, path, to); if (r.assigned) onAccess?.({ person: r.assigned }); } })(),
        Promise.all(teams.map(async (t) => ({ team: t, r: await ucpApi.shareWithGroup(marketId, path, t) }))),
      ]);
      if (list.length) said.push(list.length === 1 ? list[0] : `${list.length} people`);
      for (const { team: t, r } of grps) {
        setGroups((gs) => gs && gs.map((g) => (g.team === t ? { ...g, shared: true } : g)).sort((a, b) => Number(b.shared) - Number(a.shared) || a.team.localeCompare(b.team)));
        onAccess?.({ group: t });
        said.push(`${t} (${r.members.length} ${r.members.length === 1 ? "person" : "people"})`);
      }
      setSent(`${said.join(" and ")} notified${note.trim() ? " \u00b7 your message is on the page" : ""}.`);
      setEmail(""); setPeople([]); setTeams([]); setNote("");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const withAccess = (groups ?? []).filter((g) => g.shared);
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setErr("Copy did not work · select the link and copy it by hand"); } };
  /* Several addresses at once, separated by commas. Nothing opens the mail app any more: a link is
     made for each person and the panel says who was notified, so sharing with five people is five
     links and one sentence rather than five mail windows. */
  /* `inline`: the workflow drawer renders these controls in place, so the chrome is dropped and
     the approve action (which belongs to the dialog's footer) is not offered there. */
  /* One body, two frames: the dialog for the page's own Share action, and `inline` for the
     workflow drawer, which shows the same controls in place rather than stacking a modal. */
  const body = <>
    {stage === "draft" && <p className="mb-3 text-sm text-ink-2">Let the business see the first version early. They open the draft, click a text or an image and comment. Nobody is assigned and nobody signs off.</p>}
    <label className="block text-xs font-medium text-ink-2" htmlFor="rv-mail">Send by e-mail</label>
    {people.length > 0 && <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="People to notify">{people.map((x) => <li key={x}>
      <span className="inline-flex items-center gap-1 border border-line-2 bg-surface-2 px-2 py-0.5 text-xs text-ink">{x}
        <button type="button" aria-label={`Remove ${x}`} title={`Remove ${x}`} className="-me-0.5 grid h-4 w-4 place-items-center text-ink-3 hover:text-crit" onClick={() => setPeople((ps) => ps.filter((y) => y !== x))}>
          <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button></span></li>)}</ul>}
    <div className="mt-1.5 flex gap-2"><input id="rv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onMailKey} onBlur={() => addPerson(email)} placeholder={people.length ? "Add another…" : "name@hsbc.com"} className="bdl-field min-w-0 flex-1" />
</div>
    <p className="text-xs text-ink-3 mt-1">A comma makes each address a chip.{stage === "draft" ? "" : " A UCP reviewer is also assigned."}</p>
    {stage !== "review" && <>
      <label className="block text-xs font-medium text-ink-2 mt-4" htmlFor="rv-group">Share with a group</label>
      {/* The picks live inside the list as checks, with a count on the trigger: a chip each added a row
          to a 320px panel for every group, so four groups pushed the Message field off the bottom. */}
      <div className="mt-1"><BdlMultiSelect id="rv-group" className="w-full" value={teams} onValueChange={setTeams} disabled={!groups}
          placeholder={groups ? "Choose a group…" : "Loading groups…"} summary={(n) => `${n} group${n === 1 ? "" : "s"} selected`}
          options={(groups ?? []).map((g) => ({ value: g.team, label: g.team, hint: `${g.members.length} ${g.members.length === 1 ? "person" : "people"}${g.shared ? " · has access" : ""}`, disabled: g.shared }))} /></div>
      <p className="text-xs text-ink-3 mt-1">{stage === "draft" ? "Everyone in the group gets the link by e-mail." : "The whole group sees it in My tasks."}</p>
      {withAccess.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Groups with access">{withAccess.map((g) => <span key={g.team} className="inline-flex items-center gap-1 text-xs bg-info-soft text-info rounded-full px-2.5 py-0.5" title={g.members.map((m) => m.name).join(", ")}><svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 13.8c1.8.6 3 2.4 3 5.2" /></svg>{g.team} · {g.members.length}</span>)}</div>}
    </>}
    <label className="block text-xs font-medium text-ink-2 mt-4" htmlFor="rv-note">Message <span className="font-normal text-ink-3">optional</span></label>
    <textarea id="rv-note" rows={3} className="bdl-field mt-1 text-sm" value={note} onChange={(e) => setNote(e.target.value)}
      placeholder={stage === "draft" ? "What would you like them to look at?" : "Anything the reviewer should know?"} />
    <p className="mt-1 text-xs text-ink-3">It is added to the page’s comments, so everyone you notify reads the same thing.</p>
    <p className="mt-3 text-xs text-ink-3">{[people.length || email.trim() ? `${(people.length || 1)} by e-mail` : "", teams.length ? `${teams.length} ${teams.length === 1 ? "group" : "groups"}` : ""].filter(Boolean).join(" and ") || "Add someone above"}</p>
    {sent && <p role="status" className="text-xs bg-good-soft text-good rounded-md px-3 py-2 mt-3">✓ {sent}</p>}
    <Err err={err} />
    {/* The link last, and as a button only. Naming people is the point of this panel; the link is the
        fallback for anyone it misses, and the URL itself was 40 characters of noise nobody reads --
        it is copied, not typed. */}
    <div className="mt-4 border-t border-line pt-3">
      <button className="btn btn-sm btn-secondary w-full justify-center" disabled={!url} onClick={copy}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" /></svg>
        {copied ? "✓ Link copied" : url ? `Copy the ${stage === "draft" ? "draft" : "review"} link` : "Creating the link…"}</button>
      <p className="mt-1.5 text-xs text-ink-3">{stage === "draft" ? "Anyone with the link sees the latest saved draft and can comment until the page is sent for review." : <>Anyone with the link can comment until the {STAGE[stage]} ends.{stage === "bizreview" ? " Only people you e-mail or a group can sign off." : ""}</>}</p>
    </div>
  </>;

  /* What replaces the form once it has gone out. The decision that follows (sign off, or send it
     back to the author) lives in the editor, so the only thing offered here is the way back to it. */
  const done = <div role="status" className="flex flex-col items-center px-2 py-6 text-center">
    <span aria-hidden className="sent-ring mb-3.5 grid size-12 place-items-center rounded-full bg-good-soft text-good">
      <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path className="sent-tick" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
    <span className="bdl-stagger flex flex-col gap-1.5">
      <b className="text-sm font-medium">{stage === "draft" ? "The draft is with the business" : "Sent for business review"}</b>
      <span className="text-xs leading-relaxed text-ink-2">{sent}</span>
      <span className="text-xs leading-relaxed text-ink-3">{stage === "draft" ? "They can open the draft and comment while you carry on editing." : "They comment on the page. When they are done, sign it off or send it back to the author."}</span>
    </span>
  </div>;
  return { body, done, sent, busy, nobody: !email.trim() && !people.length && !teams.length, sendAll };
}

const shareTitle = (stage: Shared["stage"]) => (stage === "draft" ? "Share the draft with the business" : `Share for ${STAGE[stage]}`);

export function ShareReviewDialog({ title, onClose, onSendBack, inline = false, ...rest }: Shared & { /** render just the controls, for embedding in a panel */ inline?: boolean }) {
  const { body, done, sent, busy, nobody, sendAll } = useShare(rest);
  if (inline) return <div className="flex flex-col">{sent ? done : body}</div>;

  return <ModalShell title={sent ? "Sent" : shareTitle(rest.stage)} subtitle={<b className="text-ink-2">{title}</b>} width={540} onClose={onClose}
    footer={sent ? <button className="btn btn-sm btn-primary" onClick={onClose}>Close</button> : <>
      {onSendBack && <button className="btn btn-sm btn-secondary mr-auto" disabled={busy} onClick={() => { onClose(); onSendBack(); }}
        title="Hand the page back to its author instead of sending it on">Go back</button>}
      <button className="btn btn-sm btn-primary" disabled={busy || nobody} onClick={sendAll}>{busy ? "Sending\u2026" : "Send"}</button>
    </>}>
    {sent ? done : body}
  </ModalShell>;
}

/**
 * The same share inside the builder's floating panel, for when the page is already being previewed.
 * A modal there covers the page the reviewer is being asked to look at, and puts a second surface
 * over the panel that was already open; this reuses that panel, with the page title as the hint and
 * the dialog's own footer. Closing (the panel header's cross) returns whatever was there before.
 */
export function ShareReviewPanel({ title, onClose, onSendBack, width, top, bottom, open, onToggle, ...rest }: Shared & { width?: number; /** clear the editor's chrome when the page is not in full-screen preview */ top?: number; bottom?: number; open: boolean; onToggle: (open: boolean) => void }) {
  const { body, done, sent, busy, nobody, sendAll } = useShare(rest);
  /* Sent: the card is the message. No title bar, no page name, no icon -- the tick and the sentence
     under it say everything those three repeated, and the Close button is the only thing to do. */
  return <FloatingPanel width={width} top={top} bottom={bottom} open={open} onToggle={onToggle} header={!sent} title={shareTitle(rest.stage)} hint={sent ? undefined : <b className="text-ink-2">{title}</b>}
    icon={<svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" /></svg>}
    /* Once it is sent there is one thing left to do, so the header loses both its controls: a cross
       and a fold-away beside a single Close button are three ways to dismiss the same confirmation. */
    fold={!sent}
    actions={sent ? undefined : <button type="button" onClick={onClose} disabled={busy} className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:bg-surface-3 hover:text-ink" title="Close" aria-label="Close sharing">
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
    footer={sent
      ? <button className="btn btn-sm btn-primary w-full justify-center" onClick={onClose}>Close</button>
      : <div className="flex items-center gap-2">
        {onSendBack && <button className="btn btn-sm btn-secondary flex-1 justify-center" disabled={busy} onClick={() => { onClose(); onSendBack(); }}
          title="Hand the page back to its author instead of sending it on">Go back</button>}
        <button className="btn btn-sm btn-primary flex-1 justify-center" disabled={busy || nobody} onClick={sendAll}>{busy ? "Sending\u2026" : "Send"}</button>
      </div>}>
    {sent ? <div className="grid h-full place-items-center">{done}</div> : body}
  </FloatingPanel>;
}
