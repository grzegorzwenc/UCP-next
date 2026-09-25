"use client";
import Link from "next/link";
import type { Model } from "@/lib/ucp/types";
import { Pill } from "@/components/ui/Pill";
import { TypeChip } from "./FieldEditor";
import { StatusPill } from "./ModelDialogs";
import { ModelIcon, chip, Crumbs } from "./bits";
import { isBlockModel, editLink, entitiesLink, groupLink } from "./fieldMeta";
import type { Props } from "./Models";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return <div className="bg-surface border border-line rounded-xl px-4 py-3"><div className="text-[11px] uppercase tracking-[.08em] text-ink-3">{label}</div><div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>{hint && <div className="text-[12px] text-ink-3 mt-0.5">{hint}</div>}</div>;
}

/**
 * Model detail: what the model is and its fields at a glance (structure only). The editor opens only on
 * "Edit model" (admins). Content built from the model lives in Content entities; one line links there.
 */
export function ModelDetail({ p, md, isAdmin, go }: { p: Props; md: Model; isAdmin: boolean; go: (href: string) => void }) {
  const block = isBlockModel(md); const used = p.usage[md.id] ?? []; const nEnt = p.entityCounts[md.id] ?? 0;
  const nav = (href: string) => ({ href, onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); go(href); } });
  return <div className="p-7">
    <Crumbs items={[{ label: "Content models", href: `${p.base}/models`, onClick: () => go(`${p.base}/models`) }, { label: md.group, href: groupLink(p.base, md.group), onClick: () => go(groupLink(p.base, md.group)) }, { label: md.name }]} />
    <div className="flex items-start gap-3 mb-5 flex-wrap"><ModelIcon m={md} big /><div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap"><h1 className="text-2xl font-semibold leading-tight">{md.name}</h1><StatusPill status={md.status} /><span className={chip} title="Draft version">v{md.version}</span>{md.publishedVersion && <span className={chip} title="Version served by the delivery API">Published: v{md.publishedVersion}</span>}</div>
      <p className="text-[13px] text-ink-3 mt-1 max-w-[720px]">{md.description || <span className="text-ink-4">No description</span>}</p></div>
      <div className="ml-auto flex gap-2 items-center flex-wrap">
        <Link className="btn btn-sm" {...nav(`${p.base}/api?tab=models&model=${md.id}`)}>View JSON schema</Link>
        {block ? <Link className="btn btn-sm" {...nav(editLink(p.base, md.id))}>View details</Link>
          : isAdmin ? <Link className="btn" {...nav(editLink(p.base, md.id))}>✎ Edit model</Link>
          : <Link className="btn btn-sm" {...nav(editLink(p.base, md.id))} title="Only site admins can change content models">View documentation</Link>}
      </div></div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 max-w-[640px]">
      <Stat label="Fields" value={md.fields.length} hint={md.fields.some((f) => f.hidden) ? `${md.fields.filter((f) => f.hidden).length} hidden from authors` : undefined} />
      <Stat label="Used on" value={used.length} hint={`page${used.length === 1 ? "" : "s"} in ${p.marketName}`} />
    </div>
    {!block && <p className="text-[13px] text-ink-3 mb-6">{nEnt} entit{nEnt === 1 ? "y uses" : "ies use"} this model · <Link {...nav(entitiesLink(p.base, md.id))} className="text-ink underline hover:text-accent-hover">Open in Content entities →</Link></p>}

    <section aria-labelledby="fields-h" className="mb-6">
      <div className="flex items-end gap-3 mb-2"><h2 id="fields-h" className="text-[15px] font-semibold">Fields</h2>{md.status === "modified" && <span className="text-[12.5px] text-ink-3">Showing the draft. Authors fill in the published schema (v{md.publishedVersion}) until it is published.</span>}</div>
      <div className="bg-surface border border-line rounded-xl overflow-hidden">{md.fields.length ? <ul>{md.fields.map((f) => <li key={f.k} className={`flex items-center gap-3 px-4 py-2 border-t border-line first:border-t-0 text-[13.5px] ${f.hidden ? "text-ink-3" : ""}`}>
        <span className="min-w-0 flex-1"><b className="font-semibold">{f.l}</b>{f.req && <span className="text-accent ml-0.5" title="Required">*</span>}<span className="font-mono text-[11.5px] text-ink-3 ml-2">{f.k}</span>{f.hidden && <span className="ml-2 text-[10.5px] uppercase tracking-[.06em] text-ink-4">hidden</span>}{f.desc && <span className="block text-[12px] text-ink-3 truncate">{f.desc}</span>}</span>
        {f.loc && <Pill status="approved" label="Localised" />}<TypeChip t={f.t} /></li>)}</ul>
        : <div className="p-6 text-center text-ink-3 text-[13px]">This model has no fields yet.{isAdmin && !block && <> <button className="underline text-ink" onClick={() => go(editLink(p.base, md.id))}>Add fields</button></>}</div>}</div>
    </section>

    {!!used.length && <section className="bg-surface border border-line rounded-lg p-4"><h4 className="text-[13px] font-semibold mb-1.5">Used on {used.length} page{used.length === 1 ? "" : "s"} <span className="font-normal text-ink-3">{p.marketName}</span></h4>
      <div className="flex flex-wrap gap-1.5">{used.slice(0, 12).map((u) => <Link key={u.path} {...nav(`${p.base}/page${u.path.replace(p.marketRoot, "")}`)} className="inline-flex items-center gap-1.5 border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] hover:bg-surface-2"><Pill status={u.status} />{u.title}</Link>)}{used.length > 12 && <span className="inline-flex items-center border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] text-ink-3">+{used.length - 12} more</span>}</div></section>}
  </div>;
}
