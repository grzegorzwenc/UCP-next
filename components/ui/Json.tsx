"use client";
import { useMemo, useState } from "react";

/** Syntax-highlighted JSON in the HSBC palette (keys slate, strings teal, numbers red, booleans/null blue) with a Copy button. */
type Tok = { t: "k" | "s" | "n" | "b" | "p"; v: string };
function tokenize(src: string): Tok[] {
  const out: Tok[] = []; const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([\s\S])/g; let m: RegExpExecArray | null; let buf = "";
  const flush = () => { if (buf) { out.push({ t: "p", v: buf }); buf = ""; } };
  while ((m = re.exec(src))) { if (m[1]) { flush(); out.push({ t: m[2] ? "k" : "s", v: m[1] }); if (m[2]) buf += m[2]; } else if (m[3]) { flush(); out.push({ t: "n", v: m[3] }); } else if (m[4]) { flush(); out.push({ t: "b", v: m[4] }); } else buf += m[5]; }
  flush(); return out;
}
const COLOR: Record<Tok["t"], string> = { k: "text-info font-medium", s: "text-good", n: "text-brand", b: "text-review", p: "text-ink-2" };

export function Json({ value, maxHeight = 520, label, className = "" }: { value: unknown; maxHeight?: number; label?: string; className?: string }) {
  const text = useMemo(() => (typeof value === "string" ? value : JSON.stringify(value, null, 2)), [value]);
  const toks = useMemo(() => tokenize(text), [text]);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return (
    <div className={`relative border border-line rounded-lg bg-surface-2 ${className}`}>
      <button type="button" onClick={copy} className="btn btn-sm absolute top-2 right-2 z-10" aria-label={label ? `Copy ${label}` : "Copy JSON"}>{copied ? "Copied" : "Copy"}</button>
      <pre className="font-mono text-xs leading-[1.55] p-3.5 pr-24 overflow-auto whitespace-pre" style={{ maxHeight }}>{toks.map((k, i) => k.t === "p" ? k.v : <span key={i} className={COLOR[k.t]}>{k.v}</span>)}</pre>
    </div>
  );
}
