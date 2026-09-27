"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { repoApi } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import type { AuditEvent, PermKey, Perms, Role, User } from "@/lib/ucp/types";
import { PERM_COLS, ROLES } from "@/lib/ucp/seed";
import { Avatar } from "@/components/ui/Avatar";
import { resolveTarget, whenOf } from "@/lib/ucp/auditView";

type Folder = { key: string; title: string; path: string };
type Props = { users: User[]; folders: Folder[]; log: AuditEvent[]; pageTitles: Record<string, string>; base: string; root: string; marketName: string; marketFlag: string; envName: string; selectedId: string };
type PermState = "own" | "inherited" | "";

/** Ported from the prototype: granted on this folder → own; else granted on the whole site → inherited. */
export function permOf(u: User, folderKey: string, col: PermKey): PermState {
  const p = u.perms ?? {}; const own = p[folderKey]?.[col]; const inh = folderKey !== "root" && p.root?.[col];
  return own ? "own" : inh ? "inherited" : "";
}
const USERS_PATH = "/home/users";
const slugId = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const SiteIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none flex-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>;
const FolderIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none flex-none text-ink-3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none text-ink-3 flex-none" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;

function PermButton({ state, onClick, disabled }: { state: PermState; onClick: () => void; disabled?: boolean }) {
  const title = state === "inherited" ? "Inherited from whole site. Click to grant here explicitly." : state === "own" ? "Granted. Click to remove." : "Not granted. Click to grant.";
  const cls = state === "own" ? "bg-good border-good text-white" : state === "inherited" ? "bg-good-soft border-good text-good" : "bg-surface-3 border-line-2 text-transparent";
  return <button type="button" disabled={disabled} aria-pressed={state !== ""} title={title} onClick={onClick} className={`w-[34px] h-[34px] rounded border text-[16px] font-bold leading-none hover:shadow-[0_0_0_3px_var(--good-soft)] disabled:opacity-50 ${cls}`}>{state ? "✓" : ""}</button>;
}

export function Users({ users: initialUsers, folders, log, pageTitles, base, root, marketName, marketFlag, selectedId }: Props) {
  const router = useRouter(); const { user: viewer } = useSession();
  const isAdmin = viewer.role === "admin" || !!viewer.perms?.root?.manage;
  // Server props win whenever they change (after router.refresh()); local copies give optimistic updates in between.
  const [users, setUsers] = useState(initialUsers); const [seenUsers, setSeenUsers] = useState(initialUsers); if (seenUsers !== initialUsers) { setSeenUsers(initialUsers); setUsers(initialUsers); }
  const [sel, setSel] = useState(selectedId || initialUsers[0]?.id || ""); const [seenSel, setSeenSel] = useState(selectedId); if (seenSel !== selectedId) { setSeenSel(selectedId); if (selectedId) setSel(selectedId); }
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [toast, setToast] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [invite, setInvite] = useState(false); const [inv, setInv] = useState({ name: "", email: "", role: "author" as Role, team: "" });
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const u = users.find((x) => x.id === sel) ?? users[0];
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return users.filter((x) => !s || `${x.name} ${x.team} ${ROLES[x.role]?.name ?? x.role}`.toLowerCase().includes(s)); }, [users, q]);
  const rows: Folder[] = [{ key: "root", title: `Whole site (${marketName})`, path: root }, ...folders];
  const userLog = u ? log.filter((e) => e.who === u.id || e.target === `user:${u.id}`).slice(0, 5) : [];
  const names = useMemo(() => Object.fromEntries(users.map((x) => [x.id, x.name])), [users]);
  const adminName = users.find((x) => x.id !== viewer.id && (x.role === "admin" || x.perms?.root?.manage))?.name ?? "a site admin";
  const locked = busy || !isAdmin;

  const select = (id: string) => { setSel(id); router.replace(`${base}/users?user=${encodeURIComponent(id)}`, { scroll: false }); };
  const persist = async (target: User, perms: Perms, text: string) => {
    setBusy(true); setErr(null);
    try { await repoApi.setProps(target.path, { "ucp:perms": JSON.stringify(perms) }, { text, type: "permissions", target: `user:${target.id}` }); setUsers((all) => all.map((x) => (x.id === target.id ? { ...x, perms } : x))); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const toggle = (folder: Folder, col: PermKey, label: string) => {
    if (!u) return; const perms: Perms = JSON.parse(JSON.stringify(u.perms ?? {})); perms[folder.key] ??= {};
    const had = !!perms[folder.key][col]; if (had) delete perms[folder.key][col]; else { perms[folder.key][col] = true; if (col !== "read") perms[folder.key].read = true; }
    const where = folder.key === "root" ? "the whole site" : folder.title;
    void persist(u, perms, had ? `removed ${u.name}’s ${label} on ${where}` : `gave ${u.name} ${label} on ${where}`).then(() => notify(`${had ? "Removed" : "Granted"} ${label} on ${where}`));
  };
  const setRole = async (role: Role) => {
    if (!u || role === u.role) return; setBusy(true); setErr(null);
    try { await repoApi.setProps(u.path, { "ucp:role": role }, { text: `changed ${u.name}’s role to ${ROLES[role].name}`, type: "permissions", target: `user:${u.id}` }); setUsers((all) => all.map((x) => (x.id === u.id ? { ...x, role } : x))); router.refresh(); notify(`Role changed to ${ROLES[role].name}`); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!u || !confirm(`Remove all access for ${u.name}?`)) return; setBusy(true); setErr(null);
    try { await repoApi.deleteNode(u.path, { text: `removed all access for ${u.name}`, type: "permissions", target: "users" }); const rest = users.filter((x) => x.id !== u.id); setUsers(rest); if (rest[0]) select(rest[0].id); router.refresh(); notify("Access removed"); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const sendInvite = async () => {
    const id = slugId(inv.name); if (!id) return; setBusy(true); setErr(null);
    const email = inv.email.trim() || `${id}@hsbc.com`; const roleName = ROLES[inv.role].name; const perms: Perms = { root: { ...ROLES[inv.role].perms } };
    try {
      await repoApi.createNode(`${USERS_PATH}/${id}`, "rep:User", { "rep:principalName": id, "profile/email": email, "ucp:name": inv.name.trim(), "ucp:role": inv.role, "ucp:team": inv.team.trim(), "ucp:perms": JSON.stringify(perms) }, { text: `invited ${inv.name.trim()} as ${roleName}`, type: "permissions", target: `user:${id}` });
      setUsers((all) => [...all, { id, path: `${USERS_PATH}/${id}`, name: inv.name.trim(), email, role: inv.role, team: inv.team.trim(), perms }]); setInvite(false); setInv({ name: "", email: "", role: "author", team: "" }); select(id); router.refresh(); notify(`Invitation sent to ${inv.name.trim()}`);
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  return (<div className="p-4 md:p-7">
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 mb-5"><div><h1 className="text-2xl font-semibold">Users & permissions</h1><p className="text-ink-3 text-[13px] mt-1">Who can see, edit, approve and publish, per folder. Click a user, then tick or untick the boxes.</p></div>
      <div className="ml-auto flex gap-2"><button className="btn btn-primary" disabled={!isAdmin} title={isAdmin ? undefined : "Only site admins can invite users"} onClick={() => { setErr(null); setInvite(true); }}>＋ Invite user</button></div></div>
    {!isAdmin && <div role="note" className="mb-4 flex items-center gap-2.5 text-[13px] text-ink-2 bg-info-soft border border-info/30 px-3.5 py-2.5 rounded-lg"><span aria-hidden="true">🔒</span>Only site admins can change users and permissions. Ask {adminName}.</div>}
    {err && <div className="mb-4 text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded" role="alert">{err}</div>}
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 items-start">
      <div className="bg-surface border border-line rounded-lg p-2.5">
        <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mx-1 mb-2 text-[13px]"><SearchIcon /><input aria-label="Find a person" className="flex-1 outline-none bg-transparent" placeholder="Find a person" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {list.length === 0 && <div className="p-4 text-center text-ink-3 text-[13px]">No one matches “{q}”.</div>}
        {list.map((x) => <button key={x.id} onClick={() => select(x.id)} aria-current={u?.id === x.id ? "true" : undefined} className={`w-full flex items-center gap-2.5 text-left rounded-md px-2.5 py-2 border-l-[3px] ${u?.id === x.id ? "bg-accent-soft border-accent" : "border-transparent hover:bg-surface-3"}`}>
          <Avatar name={x.name} size={32} /><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-medium text-ink truncate">{x.name}</span><small className="block text-ink-3 text-[11.5px] truncate">{ROLES[x.role]?.name ?? x.role} · {x.team}</small></span></button>)}
      </div>
      {u ? <div className="min-w-0">
        <div className="bg-surface border border-line rounded-lg p-5 mb-3.5 flex gap-4 items-center flex-wrap">
          <Avatar name={u.name} size={56} /><div className="flex-1 min-w-[200px]"><div className="text-[20px] font-semibold">{u.name}</div><div className="font-mono text-ink-3 text-[12.5px]">{u.email} · {u.team} · signs in with company SSO</div></div>
          <label className="min-w-[220px] text-[12px] text-ink-2 font-medium">Role (sets default permissions)<select disabled={locked} className="mt-1 block w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink font-normal bg-surface" value={u.role} onChange={(e) => void setRole(e.target.value as Role)}>{(Object.keys(ROLES) as Role[]).map((k) => <option key={k} value={k}>{ROLES[k].name}</option>)}</select></label>
          <button className="btn" disabled={locked} onClick={() => void remove()}>Remove access</button>
        </div>
        <div className="bg-surface border border-line rounded-lg p-5">
          <h3 className="text-[15px] font-semibold mb-3">Permissions on {marketFlag} {marketName} <span className="font-normal text-ink-3 text-[13px]">Whole-site permissions apply to every folder unless a folder says otherwise</span></h3>
          <div className="overflow-auto"><table className="w-full text-[13.5px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-2 border-b border-line-2">Folder</th>{PERM_COLS.map((c) => <th key={c[0]} title={c[2]} className="p-2 border-b border-line-2 text-center">{c[1]}</th>)}</tr></thead>
            <tbody>{rows.map((f) => <tr key={f.key} className={f.key === "root" ? "bg-surface-2" : ""}><td className="p-2 border-b border-line"><span className={`inline-flex items-center gap-2 ${f.key === "root" ? "font-semibold" : ""}`}>{f.key === "root" ? <SiteIcon /> : <FolderIcon />}{f.title}</span></td>
              {PERM_COLS.map((c) => { const st = permOf(u, f.key, c[0]); return <td key={c[0]} className="p-2 border-b border-line text-center"><PermButton state={st} disabled={locked} onClick={() => toggle(f, c[0], c[1])} />{st === "inherited" && <small className="block text-[10.5px] text-ink-3 leading-tight mt-0.5">inherited</small>}</td>; })}</tr>)}</tbody></table></div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3 text-[12.5px] text-ink-2"><span><i className="inline-block w-[9px] h-[9px] rounded-[2px] mr-1.5 align-[-1px] bg-good" />Granted here</span><span><i className="inline-block w-[9px] h-[9px] rounded-[2px] mr-1.5 align-[-1px] bg-good-soft border border-good" />Inherited from whole site</span><span><i className="inline-block w-[9px] h-[9px] rounded-[2px] mr-1.5 align-[-1px] bg-surface-3 border border-line-2" />Not granted</span></div>
        </div>
        <div className="bg-surface border border-line rounded-lg p-5 mt-3.5">
          <h3 className="text-[15px] font-semibold mb-2 flex items-baseline gap-3">Recent activity for {u.name} <Link href={`${base}/audit?who=${encodeURIComponent(u.id)}`} className="text-[13px] font-normal text-info underline-offset-2 hover:underline ml-auto">Full audit log</Link></h3>
          {userLog.length === 0 ? <div className="text-ink-3 text-[13px]">No activity yet.</div> : <ul>{userLog.map((e) => { const t = resolveTarget(e.target, { base, root, pages: pageTitles, names }); const inner = <><span className="font-mono text-[12px] text-ink-3 w-[120px] flex-none">{whenOf(e.time)}</span><span className="text-[13.5px]"><b className="font-semibold">{e.who === u.id ? u.name : names[e.who] ?? (e.who === "system" ? "System" : e.who)}</b> {e.text}</span></>;
            return <li key={e.id} className="border-b border-line last:border-0">{t.kind === "page" && t.href ? <Link href={t.href} className="flex gap-3 py-2 hover:bg-surface-2 -mx-2 px-2 rounded">{inner}</Link> : <div className="flex gap-3 py-2">{inner}</div>}</li>; })}</ul>}
        </div>
      </div> : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No users yet.{isAdmin && <> <button className="underline" onClick={() => setInvite(true)}>Invite the first person</button>.</>}</div>}
    </div>
    {invite && isAdmin && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setInvite(false); }}>
      <div role="dialog" aria-labelledby="inv" className="bg-surface rounded-xl w-[min(560px,94vw)] shadow-2xl">
        <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="inv" className="text-lg font-semibold">Invite user</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={() => setInvite(false)} aria-label="Close">×</button></header>
        <div className="px-6 pb-2 grid grid-cols-2 gap-x-4 gap-y-3">
          <label className="col-span-2 text-xs text-ink-3">Full name<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value, email: inv.email && inv.email !== `${slugId(inv.name)}@hsbc.com` ? inv.email : `${slugId(e.target.value)}@hsbc.com` })} placeholder="e.g. Sam Patel" /></label>
          <label className="col-span-2 text-xs text-ink-3">Work email<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink font-mono" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder="sam.patel@hsbc.com" /></label>
          <label className="text-xs text-ink-3">Role<select className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink bg-surface" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })}>{(Object.keys(ROLES) as Role[]).map((k) => <option key={k} value={k}>{ROLES[k].name}</option>)}</select></label>
          <label className="text-xs text-ink-3">Team<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={inv.team} onChange={(e) => setInv({ ...inv, team: e.target.value })} placeholder="e.g. Cards" /></label>
          <div className="col-span-2 text-[12px] text-ink-3">Sign-in id <span className="font-mono text-ink">{slugId(inv.name) || "…"}</span> · starts with the {ROLES[inv.role].name} permissions on the whole site; adjust per folder afterwards.</div>
          {err && <div className="col-span-2 text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
        </div>
        <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn" onClick={() => setInvite(false)}>Cancel</button><button className="btn btn-primary" disabled={!slugId(inv.name) || busy} onClick={() => void sendInvite()}>{busy ? "Inviting…" : "Send invitation"}</button></footer>
      </div></div>}
    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50" role="status">{toast}</div>}
  </div>);
}
