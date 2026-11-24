"use client";
import Link from "next/link";
import { FileText, ListChecks } from "lucide-react";
import type { Model } from "@/lib/ucp/types";
import { Pill } from "@/components/ui/Pill";
import { TypeChip } from "./FieldEditor";
import { UsedOn } from "./UsedOn";
import { isBlockModel, entitiesLink } from "./fieldMeta";
import type { Props } from "./Models";

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; hint?: string }) {
  return (
    <div className="bdl-card flex items-center gap-3 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-ink-3" />
      <span className="text-lg font-medium tabular-nums leading-none">{value}</span>
      <span className="min-w-0 truncate text-sm text-ink-2">{label}{hint ? <span className="text-ink-3"> · {hint}</span> : null}</span>
    </div>
  );
}

/**
 * The model's General tab: what it is, how big it is and where it is used.
 *
 * It used to be a page of its own at `?model=<id>`, reached from the editor by "View
 * documentation" and left again by a back link -- two pages showing the same model, each with its
 * own title, crumbs and badges. It is now the first tab, so the header belongs to the page and
 * this renders only the body.
 */
export function ModelOverview({ p, md, isAdmin, go, onTab }: { p: Props; md: Model; isAdmin: boolean; go: (href: string) => void; onTab: (t: "fields") => void }) {
  const block = isBlockModel(md); const used = p.usage[md.id] ?? []; const nEnt = p.entityCounts[md.id] ?? 0;
  const nav = (href: string) => ({ href, onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); go(href); } });
  return <div className="grid gap-4">
    <p className="max-w-[720px] text-sm text-ink-2">{md.description || <span className="text-ink-4">No description</span>}</p>
    <div className="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
      <Stat icon={ListChecks} label={`field${md.fields.length === 1 ? "" : "s"}`} value={md.fields.length} hint={md.fields.some((f) => f.hidden) ? `${md.fields.filter((f) => f.hidden).length} hidden from authors` : undefined} />
      <Stat icon={FileText} label={`page${used.length === 1 ? "" : "s"} use this model`} value={used.length} />
    </div>
    {!block && <p className="text-sm text-ink-3 mb-6">{nEnt} entit{nEnt === 1 ? "y uses" : "ies use"} this model · <Link {...nav(entitiesLink(p.base, md.id))} className="text-ink underline hover:text-brand-hover">Open in Content entities →</Link></p>}

    <section aria-labelledby="fields-h" className="mb-6">
      <div className="flex items-end gap-3 mb-2"><h2 id="fields-h" className="text-base font-medium">Fields</h2>{md.status === "modified" && <span className="text-xs text-ink-3">Showing the draft. Authors fill in the published schema (v{md.publishedVersion}) until it is published.</span>}</div>
      <div className="bg-surface border border-line rounded-xl overflow-hidden">{md.fields.length ? <ul>{md.fields.map((f) => <li key={f.k} className={`flex items-center gap-3 px-4 py-2 border-t border-line first:border-t-0 text-sm ${f.hidden ? "text-ink-3" : ""}`}>
        <span className="min-w-0 flex-1"><b className="font-medium">{f.l}</b>{f.req && <span className="text-brand ml-0.5" title="Required">*</span>}<span className="text-xs text-ink-3 ml-2">{f.k}</span>{f.hidden && <span className="ml-2 text-xs uppercase tracking-[.06em] text-ink-4">hidden</span>}{f.desc && <span className="block text-xs text-ink-3 truncate">{f.desc}</span>}</span>
        {f.loc && <Pill status="approved" label="Localised" />}<TypeChip t={f.t} /></li>)}</ul>
        : <div className="p-6 text-center text-ink-3 text-sm">This model has no fields yet.{isAdmin && !block && <> <button className="underline text-ink" onClick={() => onTab("fields")}>Add fields</button></>}</div>}</div>
    </section>

    <UsedOn pages={used} base={p.base} marketRoot={p.marketRoot} go={go} empty="Pages show this model’s content once an entity of it is used on a page." />
  </div>;
}
