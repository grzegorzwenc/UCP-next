"use client";

import { useRef, useState } from "react";
import { Check, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { SectionTitle } from "./SectionTitle";
import { reconcileRow, writeLayout, type Layout } from "@/lib/dashboard-layout";

export type WorkspaceCard = {
  id: string;
  /** Shown on the card's bar while editing, and read out by the reorder announcements. */
  label: string;
  node: React.ReactNode;
};

export type WorkspaceRow = {
  id: string;
  /** How many cards the row must keep visible. The charts row keeps one; the lists row can empty. */
  min: number;
  cards: WorkspaceCard[];
};

/**
 * The cards a person keeps, in the order they keep them. Rearranging and hiding happen in an
 * edit mode behind a "Customise" button, which is the only time the card chrome appears — the
 * rest of the time this renders the same grid the dashboard had before.
 *
 * Cards arrive as already-rendered server nodes, so hiding one costs no request and the page
 * keeps doing its data fetching on the server.
 *
 * Dragging is deliberately confined to a row: a chart and a list panel are different shapes and
 * different heights, so a row of one mixed with the other reads as a mistake. A drag that strays
 * into the other row simply never offers a drop.
 */
const COLS = ["", "grid-cols-1", "grid-cols-1 md:grid-cols-2", "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"];

export function Workspace({ rows, saved }: { rows: WorkspaceRow[]; saved: Layout }) {
  const [layout, setLayout] = useState<Layout>(() =>
    Object.fromEntries(rows.map((r) => [r.id, reconcileRow(r.cards.map((c) => c.id), saved[r.id], r.min)])));
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<{ row: string; id: string } | null>(null);
  const [said, setSaid] = useState("");

  /* Dragging reorders on every dragover, so the handlers read the newest layout from here rather
     than from a render that a burst of events may have outrun. */
  const latest = useRef(layout);

  function apply(next: Layout, persist = true) {
    latest.current = next;
    setLayout(next);
    if (persist) writeLayout(next);
  }

  function move(rowId: string, id: string, to: number, persist = true) {
    const cur = latest.current[rowId];
    const from = cur.order.indexOf(id);
    if (from < 0 || to < 0 || to >= cur.order.length || to === from) return;
    const order = cur.order.slice();
    order.splice(to, 0, order.splice(from, 1)[0]);
    apply({ ...latest.current, [rowId]: { ...cur, order } }, persist);
  }

  function toggle(row: WorkspaceRow, card: WorkspaceCard) {
    const cur = latest.current[row.id];
    const hiding = !cur.hidden.includes(card.id);
    if (hiding && cur.order.length - cur.hidden.length <= row.min) return;
    const hidden = hiding ? [...cur.hidden, card.id] : cur.hidden.filter((x) => x !== card.id);
    apply({ ...latest.current, [row.id]: { ...cur, hidden } });
    setSaid(`${card.label} ${hiding ? "hidden" : "shown"}`);
  }

  function reset() {
    apply(Object.fromEntries(rows.map((r) => [r.id, { order: r.cards.map((c) => c.id), hidden: [] }])));
    setSaid("Layout reset to the default");
  }

  const hiddenTotal = rows.reduce((n, r) => n + layout[r.id].hidden.length, 0);

  const controls = editing ? (
    <>
      <button type="button" className="btn btn-sm btn-ghost inline-flex cursor-pointer items-center gap-1.5" onClick={reset}>
        <RotateCcw className="size-3.5" />
        Reset
      </button>
      <button
        type="button"
        className="btn btn-sm btn-secondary inline-flex cursor-pointer items-center gap-1.5"
        onClick={() => { setEditing(false); setSaid("Your layout is saved."); }}
      >
        <Check className="size-4" />
        Done
      </button>
    </>
  ) : (
    <>
      {hiddenTotal > 0 && (
        <button
          type="button"
          className="bdl-chip"
          onClick={() => setEditing(true)}
          title="Nothing has been deleted — show them again any time."
        >
          <EyeOff className="size-3.5" />
          {hiddenTotal} card{hiddenTotal === 1 ? "" : "s"} hidden
        </button>
      )}
      <button
        type="button"
        className="btn btn-sm btn-secondary inline-flex cursor-pointer items-center gap-1.5"
        onClick={() => setEditing(true)}
      >
        <SlidersHorizontal className="size-4" />
        Customise
      </button>
    </>
  );

  return (
    <>
      <SectionTitle
        id="workspace"
        help="How content is spread across statuses, how activity has trended, and what needs you now."
        right={controls}
      >
        Your workspace
      </SectionTitle>

      {editing && (
        <p className="mb-3 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-3 duration-160 animate-in fade-in ease-out motion-reduce:animate-none">
          Drag a card by its handle to reorder it, or use the arrow keys. Hide what you do not need —
          the rest of the row grows to fill the space. Cards can only move within their own row, and
          the charts row keeps at least one.
        </p>
      )}

      <div className="flex flex-col gap-3.5">
        {rows.map((row) => {
          const cur = layout[row.id];
          const shown = editing ? cur.order : cur.order.filter((id) => !cur.hidden.includes(id));
          if (!shown.length) return null;
          const visible = cur.order.length - cur.hidden.length;
          return (
            <div key={row.id} className={`grid min-w-0 gap-3.5 ${COLS[Math.min(shown.length, 3)]}`}>
              {shown.map((id, i) => {
                const card = row.cards.find((c) => c.id === id);
                if (!card) return null;
                const hidden = cur.hidden.includes(id);
                const atFloor = !hidden && visible <= row.min;
                return (
                  <div
                    key={id}
                    draggable={editing}
                    onDragStart={(e) => {
                      setDrag({ row: row.id, id });
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", id);
                    }}
                    onDragOver={(e) => {
                      /* No preventDefault for the other row: the browser then shows "no drop",
                         which is the feedback we want for a cross-row drag. */
                      if (!drag || drag.row !== row.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (drag.id !== id) move(row.id, drag.id, i, false);
                    }}
                    onDrop={(e) => { e.preventDefault(); writeLayout(latest.current); setDrag(null); }}
                    onDragEnd={() => { writeLayout(latest.current); setDrag(null); }}
                    className={`flex min-w-0 flex-col duration-160 ease-out ${drag?.id === id ? "opacity-60" : ""} ${hidden ? "opacity-50" : ""}`}
                  >
                    {editing && (
                      <div className="flex items-center gap-1 border border-b-0 border-line bg-surface-2 px-2 py-1 duration-160 animate-in fade-in slide-in-from-top-1 ease-out motion-reduce:animate-none">
                        <button
                          type="button"
                          className="btn btn-icon btn-square cursor-grab active:cursor-grabbing"
                          aria-label={`Reorder ${card.label}, position ${i + 1} of ${shown.length}. Use the arrow keys.`}
                          onKeyDown={(e) => {
                            const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
                              : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                            if (!step) return;
                            e.preventDefault();
                            const to = i + step;
                            if (to < 0 || to >= shown.length) return;
                            move(row.id, id, to);
                            setSaid(`${card.label} moved to position ${to + 1} of ${shown.length}`);
                          }}
                        >
                          <GripVertical className="size-4" />
                        </button>
                        <span className="min-w-0 truncate text-xs font-medium text-ink-2">{card.label}</span>
                        {hidden && <span className="shrink-0 text-xs text-ink-3">Hidden</span>}
                        <button
                          type="button"
                          className="btn btn-icon btn-square ms-auto cursor-pointer"
                          disabled={atFloor}
                          onClick={() => toggle(row, card)}
                          aria-label={hidden ? `Show ${card.label}` : `Hide ${card.label}`}
                          title={atFloor
                            ? `This row keeps at least ${row.min} card${row.min === 1 ? "" : "s"}`
                            : hidden ? `Show ${card.label}` : `Hide ${card.label}`}
                        >
                          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    )}
                    <div className={`min-w-0 flex-1 ${editing ? "pointer-events-none select-none" : ""}`}>{card.node}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <span aria-live="polite" className="sr-only">{said}</span>
    </>
  );
}
