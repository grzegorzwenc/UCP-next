"use client";

import { useMemo, useState } from "react";
import { Check, Folder, Plus, Search, X } from "lucide-react";
import { ModalShell } from "@/components/models/ModalShell";
import { PAGE_TEMPLATES, MESSAGE_TEMPLATES, FORM_TEMPLATES, CHANNEL_LABEL, CHANNEL_ORDER } from "@/lib/blocks/registry";

/**
 * "Create page", ported from the mock's `pages/create-page-dialog.svelte`.
 *
 * Pick a template (or blank) on the left, name and place the page on the right, one Create button.
 * The old dialog was a single column of fields with the templates as five small text boxes at the
 * bottom, so the choice that decides what the page *is* read as an afterthought. Here it takes the
 * larger pane, each template is a tile with a thumbnail, and the footer keeps a running line of
 * what is about to be made.
 *
 * The thumbnails are drawn from each template's real block list rather than shipped as images, so
 * they cannot drift from what the template actually creates.
 */

export type NewPageRequest = { title: string; slug: string; parentPath: string; locale: string; templateId: string };

/** Rough shape of each block type, for the tile thumbnails: how tall, and how it is divided. */
const SHAPE: Record<string, { h: number; cols?: number; lines?: number; tone?: "solid" | "soft" }> = {
  mast: { h: 26, tone: "solid" },
  banner: { h: 16, tone: "solid" },
  contentmaster: { h: 14, lines: 3 },
  text: { h: 12, lines: 3 },
  icontiles: { h: 14, cols: 4 },
  mastertiles: { h: 16, cols: 3 },
  linktiles: { h: 12, cols: 3 },
  facts: { h: 12, cols: 3 },
  rates: { h: 14, lines: 2 },
  faq: { h: 12, lines: 2 },
  form: { h: 16, lines: 2 },
  envelope: { h: 8, lines: 2 }, emailheader: { h: 8, tone: "solid" }, emailhero: { h: 26, tone: "solid" }, emailheading: { h: 8, lines: 1 }, emailtext: { h: 12, lines: 3 },
  emailbutton: { h: 6, tone: "solid" }, emailproduct: { h: 14, lines: 2 }, emaildivider: { h: 2, lines: 1 }, emailfooter: { h: 10, lines: 2 },
  sms: { h: 40, lines: 3 }, push: { h: 30, lines: 2 }, inapp: { h: 60, lines: 4 },
  footnotes: { h: 8, lines: 1 },
  disclaimer: { h: 8, lines: 1 },
};

function TemplateThumb({ blocks }: { blocks: string[] }) {
  if (!blocks.length) {
    return <span className="flex aspect-[16/10] w-full items-center justify-center border-b border-dashed border-line-2 bg-surface-2 text-ink-3"><Plus className="size-7" strokeWidth={1.5} aria-hidden /></span>;
  }
  return <span className="flex aspect-[16/10] w-full flex-col gap-[3px] overflow-hidden border-b border-line bg-surface-2 p-2" aria-hidden>
    {blocks.slice(0, 6).map((b, i) => {
      const s = SHAPE[b] ?? { h: 12, lines: 2 };
      if (s.cols) return <span key={i} className="flex flex-none gap-[3px]" style={{ height: s.h }}>{Array.from({ length: s.cols }).map((_, c) => <span key={c} className="flex-1 bg-ink/15" />)}</span>;
      if (s.tone === "solid") return <span key={i} className="flex-none bg-ink/30" style={{ height: s.h }} />;
      return <span key={i} className="flex flex-none flex-col justify-center gap-[3px]" style={{ height: s.h }}>{Array.from({ length: s.lines ?? 2 }).map((_, l) => <span key={l} className="h-[3px] bg-ink/15" style={{ width: l === 0 ? "55%" : "100%" }} />)}</span>;
    })}
  </span>;
}

const TILE = "group flex cursor-pointer flex-col border bg-surface text-left transition-[border-color,box-shadow] duration-150 ease-out hover:shadow-sm";
const tileOn = (on: boolean) => `${TILE} ${on ? "border-brand shadow-[inset_0_0_0_1px_var(--brand)]" : "border-line-2"}`;

export function CreatePageDialog({
  messaging = false, hostPages, defaultParent, defaultTemplateId, locales, folderSelect, relPath, marketName, busy, err, onClose, onCreate,
}: {
  /** Messaging: "What do you want to create?" — message templates grouped by channel instead of page templates. */
  messaging?: boolean;
  /** Forms: every form is built for a page, so Location is a page picker over the site, not a folder. */
  hostPages?: { path: string; title: string; rel: string; folder?: boolean }[];
  defaultParent: string;
  /** Preselect a template, from the Templates screen's deep link. */
  defaultTemplateId?: string | null;
  locales: string[];
  /** The explorer's own folder picker, so there is one of those, not two. */
  folderSelect: (value: string, onChange: (v: string) => void) => React.ReactNode;
  relPath: (p: string) => string;
  marketName: string;
  busy: boolean;
  err: React.ReactNode;
  onClose: () => void;
  onCreate: (req: NewPageRequest) => void;
}) {
  const forms = !!hostPages;
  const templates = forms ? FORM_TEMPLATES : messaging ? MESSAGE_TEMPLATES : PAGE_TEMPLATES;
  const [hostQ, setHostQ] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [parent, setParent] = useState(defaultParent);
  const [locale, setLocale] = useState(locales[0] ?? "en-GB");
  /* `defaultTemplateId` is the deep link from the Templates screen ("New page from this template",
     ?new=1&template=…), the same job as the mock's prop of that name. */
  const [choice, setChoice] = useState(defaultTemplateId && templates.some((t) => t.id === defaultTemplateId) ? defaultTemplateId : templates[0]?.id ?? "blank");
  const [filter, setFilter] = useState("");
  /* No effect syncing `parent` to `defaultParent`: the explorer mounts this dialog behind a
     condition, so it is created fresh each time and the initial state is already the open folder. */

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? templates.filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)) : templates;
  }, [filter, templates]);
  const chosen = templates.find((t) => t.id === choice) ?? null;
  const at = relPath(parent).replace(/\/$/, "");
  const valid = !!title.trim() && (!forms || hostPages!.some((h) => !h.folder && h.path === parent));
  const go = () => { if (valid && !busy) onCreate({ title: title.trim(), slug: slug || slugify(title), parentPath: parent, locale, templateId: choice }); };

  return <ModalShell title={forms ? "Create a form" : messaging ? "What do you want to create?" : "Create page"} subtitle={forms ? "Pick a form template and the page the form is shown on, then name it." : messaging ? "Pick the type of message and its template, then name it and choose the folder." : "Pick what it starts from, then name it and say where it lives."} width={1100} onClose={onClose}
    footer={<div className="flex w-full items-center gap-3">
      {/* a running line of what is about to be made, as in the mock's footer */}
      <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{chosen ? chosen.name : messaging ? "Message" : "Blank page"} · {marketName}{at} · {locale}</span>
      <button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn btn-sm btn-primary" disabled={!valid || busy} onClick={go}>{busy ? "Creating…" : forms ? "Create form" : messaging ? "Create message" : "Create page"}</button>
    </div>}>
    <div className="-mx-6 -my-5 grid max-h-[72svh] min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ── Start from ── */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <span className="text-sm font-medium">Start from</span>
          <div className="relative ms-auto">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            {/* padding as a style, not `ps-8`: `.bdl-field` is unlayered, so it beats Tailwind's
                layered utilities and the text would start under the search icon. */}
            <input className="bdl-field w-52" style={{ paddingInlineStart: "2rem", paddingInlineEnd: "1.75rem" }} placeholder="Filter templates" aria-label="Filter templates" value={filter} onChange={(e) => setFilter(e.target.value)} />
            {filter && <button type="button" className="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center text-ink-3 hover:text-ink" aria-label="Clear the filter" onClick={() => setFilter("")}><X className="size-3.5" aria-hidden /></button>}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4" role="radiogroup" aria-label="Start from">
          {messaging && <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Message type">{CHANNEL_ORDER.map((c) => { const first = templates.find((t) => t.channel === c); const on = chosen?.channel === c; return <button key={c} type="button" aria-pressed={on} onClick={() => first && setChoice(first.id)} className={`border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-white" : "border-line-2 hover:bg-surface-3"}`}>{CHANNEL_LABEL[c]}</button>; })}</div>}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(11rem,1fr))]">
            {shown.length ? shown.filter((t) => !messaging || !chosen?.channel || t.channel === chosen.channel).map((t) => { const on = choice === t.id; return (
              <button type="button" key={t.id} role="radio" aria-checked={on} className={tileOn(on)} onClick={() => setChoice(t.id)}>
                <TemplateThumb blocks={t.blocks} />
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">{t.name}{on && <Check className="ms-auto size-4 flex-none text-brand" strokeWidth={2.4} aria-hidden />}</span>
                  <span className="truncate text-xs text-ink-3" title={t.desc}>{t.blocks.length ? `${t.blocks.length} component${t.blocks.length === 1 ? "" : "s"}` : "Nothing yet — add your own"}</span>
                </span>
              </button>); })
              : <p className="col-span-full py-10 text-center text-sm text-ink-3">No template matches “{filter.trim()}”.</p>}
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <form className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-line bg-surface-2/40 p-5 lg:border-s lg:border-t-0" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <div>
          <p className="text-sm font-medium text-ink">Details</p>
          <p className="text-xs text-ink-3">{chosen && chosen.blocks.length ? <>Based on <b className="font-medium text-ink-2">{chosen.name}</b>: {chosen.desc}</> : "An empty page. You add the components yourself."}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="np-title">{forms ? "Form name" : messaging ? "Message name" : "Page name"} <span className="text-brand" aria-hidden>*</span></label>
          <input id="np-title" autoFocus className="bdl-field" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder={forms ? "e.g. Personal loan application" : messaging ? "e.g. Spring ISA offer" : "e.g. Regular saver"} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink" id="np-folder">{forms ? "Shown on page" : "Location"}{forms && <span className="text-brand" aria-hidden> *</span>}</span>
          {forms ? <>
            <input className="bdl-field" placeholder="Find a page" aria-label="Find a page" value={hostQ} onChange={(e) => setHostQ(e.target.value)} />
            <div className="max-h-40 overflow-auto border border-line-2" role="listbox" aria-labelledby="np-folder">{hostPages!.filter((h) => !h.folder && (!hostQ || (h.title + h.rel).toLowerCase().includes(hostQ.toLowerCase()))).map((h) => <button type="button" role="option" aria-selected={parent === h.path} key={h.path} onClick={() => setParent(h.path)} className={`block w-full px-2.5 py-1.5 text-left text-xs border-b border-line last:border-b-0 ${parent === h.path ? "bg-ink text-white" : "hover:bg-surface-3"}`}><b className="font-medium">{h.title}</b> <span className="opacity-70">{h.rel}</span></button>)}</div>
            <p className="text-xs text-ink-3">The form lives in Forms in a folder that mirrors this page’s place in the site.</p>
          </> : folderSelect(parent, setParent)}
          {/* only when it says something the picker does not: at the market root the two matched */}
          {at && <p className="inline-flex items-center gap-1.5 text-xs text-ink-3"><Folder className="size-3.5 flex-none" aria-hidden />{marketName}{at}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink" id="np-lang">Language</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="np-lang">
            {locales.map((l) => <button type="button" key={l} role="radio" aria-checked={locale === l} onClick={() => setLocale(l)}
              className="inline-flex h-7 cursor-pointer items-center border border-line-2 px-2.5 text-xs transition-colors duration-150 ease-out hover:bg-surface-3 aria-[checked=true]:border-ink aria-[checked=true]:bg-ink aria-[checked=true]:text-white">{l}</button>)}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{forms ? "Form ID" : messaging ? "Message ID" : "URL"}</span>
          <input className="bdl-field font-mono text-xs" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} aria-label="URL name" />
          <p className="truncate text-xs text-ink-3" title={`${at}/${slug || "page-name"}`}>{at}/{slug || "page-name"}</p>
        </div>
        {err}
      </form>
    </div>
  </ModalShell>;
}
