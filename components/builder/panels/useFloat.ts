"use client";
import { useRef, useState } from "react";

/**
 * Detach / dock for a builder panel.
 *
 * Docked, a panel is a column beside the canvas. Detached, it becomes a free-standing card
 * the author drags by its grip strip — useful when the canvas is at 1:1 and the docked panel
 * would squeeze it. Docking resets the position, so a panel never comes back off-screen.
 *
 * Position is dragged with pointer events and written straight to `transform` rather than to
 * a CSS variable: a variable on the panel would recalculate styles for every row inside it
 * on each pointer move, which is exactly the list that must stay smooth while dragging.
 */
export type Float = ReturnType<typeof useFloat>;

/** `onChange` lets the builder reclaim the docked column for the canvas while a panel floats. */
export function useFloat(onChange?: (floating: boolean) => void) {
  const [floating, setFloatingRaw] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const el = useRef<HTMLElement | null>(null);

  /** Drag the detached panel by its grip. Pointer capture keeps the drag alive outside the strip. */
  function onGripDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    const sx = e.clientX - pos.x, sy = e.clientY - pos.y;
    grip.setPointerCapture(e.pointerId);
    let next = pos;
    const move = (ev: PointerEvent) => {
      // Keep a corner on screen whichever way it is dragged, so it can always be grabbed back.
      next = { x: Math.max(-240, ev.clientX - sx), y: Math.max(-8, ev.clientY - sy) };
      if (el.current) el.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };
    const up = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      grip.removeEventListener("pointercancel", up);
      setPos(next); // commit once, instead of re-rendering on every move
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  }

  const dock = () => { setFloatingRaw(false); setPos({ x: 0, y: 0 }); if (el.current) el.current.style.transform = ""; onChange?.(false); };
  const detach = () => { setFloatingRaw(true); onChange?.(true); };

  /** Spread onto the panel element. */
  const panelProps = {
    ref: (n: HTMLElement | null) => { el.current = n; },
    style: floating ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined,
  };

  return { floating, detach, dock, onGripDown, panelProps };
}
