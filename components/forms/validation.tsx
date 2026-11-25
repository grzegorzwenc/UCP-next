"use client";
import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";

/**
 * Validation of one form field, in the field's Configure panel: whether it must be answered, what a valid
 * answer looks like (picked from ready-made formats rather than typed as a regular expression), and the
 * messages the customer sees. A "Try it" box checks an answer against the settings as the customer would.
 */
type P = Record<string, unknown>;
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const plain = (v: unknown) => s(v).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

/** Keys edited here, so the Content section leaves them out. */
export const VALIDATION_KEYS = ["required", "maxLength", "pattern", "error", "min", "max", "types", "size", "format", "errorFormat", "dateRule"];

export const TEXT_FORMATS: { id: string; label: string; pattern: string; example: string }[] = [
  { id: "any", label: "Any text", pattern: "", example: "" },
  { id: "letters", label: "Letters only", pattern: "^[A-Za-zÀ-ž '\\-]+$", example: "Jane O'Neil" },
  { id: "digits", label: "Numbers only", pattern: "^[0-9]+$", example: "123456" },
  { id: "postcode", label: "UK postcode", pattern: "^[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}$", example: "SW1A 1AA" },
  { id: "sortcode", label: "Sort code", pattern: "^[0-9]{2}-?[0-9]{2}-?[0-9]{2}$", example: "40-11-62" },
  { id: "account", label: "Account number", pattern: "^[0-9]{8}$", example: "12345678" },
  { id: "custom", label: "Custom", pattern: "", example: "" },
];
export const DATE_RULES = ["Any date", "In the past", "In the future", "Customer is 18 or over"];
const formatOf = (p: P) => s(p.format) || (s(p.pattern) ? TEXT_FORMATS.find((f) => f.pattern && f.pattern === s(p.pattern))?.id ?? "custom" : "any");

const noun = (p: P) => plain(p.label).toLowerCase() || "an answer";
export const defaultRequired = (type: string, p: P) => type === "fchoice" ? `Please select ${noun(p)}` : type === "ffile" ? "Please upload a file" : type === "fconsent" ? "Please tick to confirm" : `Please enter ${noun(p)}`;
export const defaultFormat = (type: string, p: P) => type === "femail" ? "Please enter a valid e-mail address" : type === "fphone" ? "Please enter a valid phone number" : type === "fnumber" ? `Please enter a number${s(p.min) !== "" && s(p.max) !== "" ? ` between ${s(p.min)} and ${s(p.max)}` : s(p.min) !== "" ? ` of at least ${s(p.min)}` : s(p.max) !== "" ? ` up to ${s(p.max)}` : ""}` : type === "fdate" ? (s(p.dateRule) === "Customer is 18 or over" ? "You must be 18 or over to apply" : s(p.dateRule) === "In the future" ? "Please enter a date in the future" : "Please enter a valid date") : `Please enter ${noun(p)} in the right format`;

/** The customer's answer checked against the field's settings: null when it passes, else the message they'd see. */
export function checkAnswer(type: string, p: P, value: string): string | null {
  const v = value.trim(); const req = p.required !== "Optional";
  if (!v) return req ? plain(p.error) || defaultRequired(type, p) : null;
  const bad = plain(p.errorFormat) || defaultFormat(type, p);
  if (type === "femail" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return bad;
  if (type === "fphone" && !/^\+?[0-9 ()-]{7,16}$/.test(v)) return bad;
  if (type === "fnumber") { const n = Number(v.replace(/,/g, "")); if (!Number.isFinite(n) || (s(p.min) !== "" && n < Number(p.min)) || (s(p.max) !== "" && n > Number(p.max))) return bad; }
  if (type === "fdate") { const d = new Date(v); if (Number.isNaN(+d)) return bad; const now = new Date(); const r = s(p.dateRule);
    if ((r === "In the past" && d >= now) || (r === "In the future" && d <= now)) return bad;
    if (r === "Customer is 18 or over") { const adult = new Date(d); adult.setFullYear(d.getFullYear() + 18); if (adult > now) return bad; } }
  if (type === "ftext") { if (s(p.maxLength) && v.length > Number(p.maxLength)) return `Please use ${s(p.maxLength)} characters or fewer`; if (s(p.pattern)) { try { if (!new RegExp(s(p.pattern)).test(v)) return bad; } catch { return "The custom pattern isn't valid, so nothing can pass it"; } } }
  return null;
}

const lbl = "block text-xs text-ink-2 font-medium mb-1";
const Chips = ({ value, opts, onPick, disabled }: { value: string; opts: [string, string][]; onPick: (v: string) => void; disabled: boolean }) =>
  <div className="flex flex-wrap gap-1">{opts.map(([v, l]) => <button key={v} type="button" disabled={disabled} className={`bdl-chip ${value === v ? "bdl-chip-active" : ""}`} aria-pressed={value === v} onClick={() => onPick(v)}>{l}</button>)}</div>;

export function FieldValidation({ type, props: p, setProp, editable }: { type: string; props: P; setProp: (k: string, v: unknown) => void; editable: boolean }) {
  const [tryV, setTryV] = useState(""); const [tried, setTried] = useState(false);
  const req = p.required !== "Optional"; const fmt = formatOf(p);
  const hasFormat = ["ftext", "femail", "fphone", "fnumber", "fdate"].includes(type);
  const testable = !["ffile", "fconsent"].includes(type);
  const result = tried ? checkAnswer(type, p, tryV) : null;
  const regexOk = (() => { if (fmt !== "custom" || !s(p.pattern)) return true; try { new RegExp(s(p.pattern)); return true; } catch { return false; } })();
  return <div className="grid gap-3">
    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
      <button type="button" role="switch" aria-checked={req} disabled={!editable} className={`mt-0.5 w-9 h-5 shrink-0 rounded-full relative ${req ? "bg-good" : "bg-line-2"}`} onClick={() => setProp("required", req ? "Optional" : "Required")}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${req ? "left-4" : "left-0.5"}`} /></button>
      <span><b className="font-medium">{type === "fconsent" ? "Customer must tick it" : "Customer must answer"}</b><span className="block text-ink-3">{req ? "They can’t continue without it." : "Shown with “(Optional)” after the label."}</span></span>
    </label>

    {type === "ftext" && <div><span className={lbl}>Allowed answer</span>
      <Chips disabled={!editable} value={fmt} opts={TEXT_FORMATS.map((f) => [f.id, f.label])} onPick={(id) => { const f = TEXT_FORMATS.find((x) => x.id === id)!; setProp("format", id); if (id !== "custom") setProp("pattern", f.pattern); }} />
      {fmt !== "any" && fmt !== "custom" && <p className="mt-1 text-xs text-ink-3">For example: {TEXT_FORMATS.find((f) => f.id === fmt)?.example}</p>}
      {fmt === "custom" && <><input className={`bdl-field mt-1.5 font-mono ${regexOk ? "" : "!border-crit"}`} disabled={!editable} value={s(p.pattern)} placeholder="^[A-Z]{2}[0-9]{6}$" aria-label="Custom pattern (regular expression)" onChange={(e) => setProp("pattern", e.target.value)} />
        <p className={`mt-1 text-xs ${regexOk ? "text-ink-3" : "text-crit"}`}>{regexOk ? "A regular expression. Ask a developer if you’re unsure, then test it below." : "This pattern isn't valid."}</p></>}
      <div className="mt-2.5 flex items-center gap-2 text-xs whitespace-nowrap"><span className="text-ink-2 font-medium">Up to</span><input className="bdl-field w-24" type="number" min={1} disabled={!editable} value={s(p.maxLength)} placeholder="no limit" aria-label="Maximum length" onChange={(e) => setProp("maxLength", e.target.value)} /><span className="text-ink-3">characters</span></div>
    </div>}

    {(type === "femail" || type === "fphone") && <p className="text-xs text-ink-3 flex gap-1.5"><Check className="size-3.5 text-good shrink-0 mt-px" aria-hidden />The format of {type === "femail" ? "an e-mail address" : "a phone number"} is checked automatically.</p>}

    {type === "fnumber" && <div><span className={lbl}>Allowed range</span><div className="flex items-center gap-2 text-xs"><span className="text-ink-3">From</span><input className="bdl-field w-24" type="number" disabled={!editable} value={s(p.min)} placeholder="any" aria-label="Minimum" onChange={(e) => setProp("min", e.target.value)} /><span className="text-ink-3">to</span><input className="bdl-field w-24" type="number" disabled={!editable} value={s(p.max)} placeholder="any" aria-label="Maximum" onChange={(e) => setProp("max", e.target.value)} /></div></div>}

    {type === "fdate" && <div><span className={lbl}>Allowed dates</span><Chips disabled={!editable} value={s(p.dateRule) || "Any date"} opts={DATE_RULES.map((d) => [d, d])} onPick={(d) => setProp("dateRule", d)} /></div>}

    {type === "ffile" && <><div><span className={lbl}>File types</span><Chips disabled={!editable} value={s(p.types)} opts={["PDF, JPG, PNG", "PDF only", "Images only"].map((x) => [x, x])} onPick={(v) => setProp("types", v)} /></div>
      <div><span className={lbl}>Largest file</span><Chips disabled={!editable} value={s(p.size)} opts={["10 MB", "5 MB", "2 MB"].map((x) => [x, x])} onPick={(v) => setProp("size", v)} /></div></>}

    {type !== "fconsent" && (req || hasFormat && (type !== "ftext" || fmt !== "any" || s(p.maxLength))) && <div className="grid gap-2"><span className="text-xs text-ink-2 font-medium">Error messages</span>
      {req && <label className="text-xs text-ink-3">When it&apos;s left empty<input className="bdl-field mt-0.5" disabled={!editable} value={plain(p.error)} placeholder={defaultRequired(type, p)} onChange={(e) => setProp("error", e.target.value)} /></label>}
      {hasFormat && (type !== "ftext" || fmt !== "any" || s(p.maxLength)) && <label className="text-xs text-ink-3">When the answer isn&apos;t valid<input className="bdl-field mt-0.5" disabled={!editable} value={plain(p.errorFormat)} placeholder={defaultFormat(type, p)} onChange={(e) => setProp("errorFormat", e.target.value)} /></label>}
      <p className="text-[11px] text-ink-4">Leave a message empty to use the standard HSBC wording shown in grey.</p></div>}

    {testable && <div className="border border-line bg-surface-2 p-2.5"><span className="block text-xs font-medium mb-1">Try it</span>
      <input className="bdl-field" type={type === "fdate" ? "date" : type === "fnumber" ? "number" : "text"} value={tryV} placeholder={type === "ftext" ? TEXT_FORMATS.find((f) => f.id === fmt)?.example || "Type an answer" : "Type an answer"} aria-label="Test an answer" onChange={(e) => { setTryV(e.target.value); setTried(true); }} />
      {tried && (result ? <p className="mt-1.5 text-xs text-crit flex gap-1"><CircleAlert className="size-3.5 shrink-0 mt-px" aria-hidden />{result}</p> : <p className="mt-1.5 text-xs text-good flex gap-1"><Check className="size-3.5 shrink-0 mt-px" aria-hidden />{tryV.trim() ? "Accepted" : "Accepted (optional, left empty)"}</p>)}
    </div>}
  </div>;
}
