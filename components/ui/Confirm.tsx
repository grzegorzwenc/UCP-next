"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { ModalShell } from "@/components/models/ModalShell";

/**
 * In-app confirmation for destructive actions (instead of the browser's confirm(), which is easy to miss and can be blocked).
 * `const ask = useConfirm(); if (!(await ask({ title, … }))) return;`
 * `typeToConfirm`: the person has to type this word first (live pages, folders with content).
 * `alt`: a second way out next to the main button (e.g. "Delete permanently" when the main one is "Archive"); then ask() resolves to "alt".
 */
export type ConfirmOptions = {
  title: string; body?: React.ReactNode; items?: { label: string; note?: string; warn?: boolean }[];
  confirmLabel?: string; danger?: boolean; typeToConfirm?: string;
  /** related things the person may include (e.g. "also delete these files"); on confirm onChoose gets the ticked ids */
  choices?: { title: string; hint?: string; list: { id: string; label: string; note?: string; on?: boolean }[] }; onChoose?: (ids: string[]) => void;
  alt?: { label: string; danger?: boolean };
  /** related things shown for information (e.g. pages that link here, linked content) */ also?: { title: string; hint?: string; list: { label: string; note?: string }[] } | { title: string; hint?: string; list: { label: string; note?: string }[] }[];
};
export type ConfirmResult = boolean | "alt";
const Ctx = createContext<(o: ConfirmOptions) => Promise<ConfirmResult>>(async () => false);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<(ConfirmOptions & { resolve: (v: ConfirmResult) => void }) | null>(null); const [typed, setTyped] = useState(""); const [picked, setPicked] = useState<string[]>([]);
  const ask = useCallback((o: ConfirmOptions) => new Promise<ConfirmResult>((resolve) => { setTyped(""); setPicked(o.choices?.list.filter((x) => x.on).map((x) => x.id) ?? []); setSt({ ...o, resolve }); }), []);
  const close = (v: ConfirmResult) => { if (v === true) st?.onChoose?.(picked); st?.resolve(v); setSt(null); };
  const ready = !st?.typeToConfirm || typed.trim().toLowerCase() === st.typeToConfirm.toLowerCase();
  return <Ctx.Provider value={ask}>
    {children}
    {st && <ModalShell title={st.title} width={520} onClose={() => close(false)}
      footer={<><button type="button" className="btn" autoFocus={!st.typeToConfirm} onClick={() => close(false)}>Cancel</button>
        {st.alt && <button type="button" className={`btn ${st.alt.danger ? "text-brand" : ""}`} onClick={() => close("alt")}>{st.alt.label}</button>}
        <button type="button" className={`btn ${st.danger ? "btn-danger" : "btn-primary"}`} disabled={!ready} onClick={() => close(true)}>{st.confirmLabel ?? "Confirm"}</button></>}>
      {st.body && <div className="text-sm text-ink-2 leading-relaxed">{st.body}</div>}
      {!!st.items?.length && <ul className="mt-3 grid gap-1 max-h-[220px] overflow-auto">{st.items.map((it, i) => <li key={i} className={`flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm ${it.warn ? "border-crit/30 bg-crit-soft" : "border-line"}`}>
        <span className="truncate flex-1 font-medium">{it.label}</span>{it.note && <span className={`text-xs whitespace-nowrap ${it.warn ? "text-crit font-medium" : "text-ink-3"}`}>{it.note}</span>}</li>)}</ul>}
      {(Array.isArray(st.also) ? st.also : st.also ? [st.also] : []).filter((a) => a.list.length).map((a) => <div key={a.title} className="mt-4"><b className="block text-sm">{a.title}</b>{a.hint && <p className="text-xs text-ink-3">{a.hint}</p>}
        <ul className="mt-1.5 grid gap-1 max-h-[160px] overflow-auto">{a.list.map((it, i) => <li key={i} className="flex items-center gap-2 border border-warn/30 bg-warn-soft/50 rounded-md px-3 py-1.5 text-sm"><span className="truncate flex-1">{it.label}</span>{it.note && <span className="text-xs text-ink-3 whitespace-nowrap">{it.note}</span>}</li>)}</ul></div>)}
      {!!st.choices?.list.length && <fieldset className="mt-4"><legend className="text-sm font-medium">{st.choices.title}</legend>{st.choices.hint && <p className="text-xs text-ink-3">{st.choices.hint}</p>}
        <ul className="mt-1.5 grid gap-1 max-h-[180px] overflow-auto">{st.choices.list.map((it) => <li key={it.id}><label className="flex items-center gap-2 border border-line rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-surface-2"><input type="checkbox" className="accent-[var(--brand)]" checked={picked.includes(it.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, it.id] : p.filter((x) => x !== it.id)))} /><span className="truncate flex-1">{it.label}</span>{it.note && <span className="text-xs text-ink-3 whitespace-nowrap">{it.note}</span>}</label></li>)}</ul></fieldset>}
      {st.typeToConfirm && <label className="block mt-4 text-xs text-ink-2">Type <b className="font-mono text-ink">{st.typeToConfirm}</b> to confirm
        <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ready) close(true); }} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm font-mono" aria-label={`Type ${st.typeToConfirm} to confirm`} /></label>}
    </ModalShell>}
  </Ctx.Provider>;
}
