"use client";
import type { Model } from "@/lib/ucp/types";
import { isBlockModel, relTime } from "./fieldMeta";

/** Small presentational pieces shared by the models list, model detail, model editor and entity editor. */
type Status = Model["status"];
const DOT: Record<Status, { c: string; t: string }> = { draft: { c: "var(--neutral)", t: "Draft · never published" }, published: { c: "var(--good)", t: "Published · matches what visitors see" }, modified: { c: "#E9A23B", t: "Modified · has changes that are not published yet" } };
export const Dot = ({ status }: { status: Status }) => <span className="w-2 h-2 rounded-full flex-none" style={{ background: DOT[status]?.c ?? DOT.draft.c }} title={DOT[status]?.t} aria-label={DOT[status]?.t} role="img" />;
export const ModelIcon = ({ m, big }: { m: Pick<Model, "icon" | "group" | "id">; big?: boolean }) => { const block = isBlockModel(m); return <span className={`grid place-items-center rounded-md flex-none ${big ? "w-10 h-10 text-xl" : "w-6 h-6 text-xs"} ${block ? "bg-info-soft text-info" : "bg-brand-soft text-brand"}`} aria-hidden>{m.icon || (block ? "▤" : "▦")}</span>; };
/** Relative time with the full timestamp on hover; suppressHydrationWarning because the server renders it in UTC and "x min ago" drifts. */
export const When = ({ iso, prefix = "", suffix = "" }: { iso?: string; prefix?: string; suffix?: string }) => { const t = relTime(iso); return <span suppressHydrationWarning title={t.full}>{prefix}{t.rel}{suffix}</span>; };
export const Toast = ({ text }: { text: string }) => <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm shadow-xl z-[60]">{text}</div>;
export const chip = "inline-flex items-center gap-1 font-mono text-xs bg-surface-3 border border-line rounded px-1.5 py-0.5";
export const Crumbs = ({ items }: { items: { label: string; onClick?: () => void; href?: string }[] }) => <nav aria-label="Breadcrumb" className="text-sm text-ink-3 mb-2 flex gap-1.5 flex-wrap">{items.map((it, i) => <span key={i} className="inline-flex gap-1.5">{i > 0 && <span className="text-ink-4" aria-hidden>/</span>}{i === items.length - 1 ? <b className="text-ink">{it.label}</b> : it.href ? <a href={it.href} onClick={(e) => { if (it.onClick) { e.preventDefault(); it.onClick(); } }} className="hover:text-ink">{it.label}</a> : <span>{it.label}</span>}</span>)}</nav>;
