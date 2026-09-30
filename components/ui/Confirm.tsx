"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { ModalShell } from "@/components/models/ModalShell";

/**
 * In-app confirmation for destructive actions (instead of the browser's confirm(), which is easy to miss and can be blocked).
 * `const ask = useConfirm(); if (!(await ask({ title, … }))) return;`
 * `typeToConfirm`: the person has to type this word first (live pages, folders with content).
 */
export type ConfirmOptions = {
  title: string; body?: React.ReactNode; items?: { label: string; note?: string; warn?: boolean }[];
  confirmLabel?: string; danger?: boolean; typeToConfirm?: string;
};
const Ctx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null); const [typed, setTyped] = useState("");
  const ask = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => { setTyped(""); setSt({ ...o, resolve }); }), []);
  const close = (v: boolean) => { st?.resolve(v); setSt(null); };
  const ready = !st?.typeToConfirm || typed.trim().toLowerCase() === st.typeToConfirm.toLowerCase();
  return <Ctx.Provider value={ask}>
    {children}
    {st && <ModalShell title={st.title} width={520} onClose={() => close(false)}
      footer={<><button type="button" className="btn" autoFocus={!st.typeToConfirm} onClick={() => close(false)}>Cancel</button>
        <button type="button" className={`btn ${st.danger ? "btn-danger" : "btn-primary"}`} disabled={!ready} onClick={() => close(true)}>{st.confirmLabel ?? "Confirm"}</button></>}>
      {st.body && <div className="text-[13.5px] text-ink-2 leading-relaxed">{st.body}</div>}
      {!!st.items?.length && <ul className="mt-3 grid gap-1 max-h-[220px] overflow-auto">{st.items.map((it, i) => <li key={i} className={`flex items-center gap-2 border rounded-md px-3 py-1.5 text-[13px] ${it.warn ? "border-crit/30 bg-crit-soft" : "border-line"}`}>
        <span className="truncate flex-1 font-medium">{it.label}</span>{it.note && <span className={`text-[11.5px] whitespace-nowrap ${it.warn ? "text-crit font-semibold" : "text-ink-3"}`}>{it.note}</span>}</li>)}</ul>}
      {st.typeToConfirm && <label className="block mt-4 text-[12.5px] text-ink-2">Type <b className="font-mono text-ink">{st.typeToConfirm}</b> to confirm
        <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ready) close(true); }} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] font-mono" aria-label={`Type ${st.typeToConfirm} to confirm`} /></label>}
    </ModalShell>}
  </Ctx.Provider>;
}
