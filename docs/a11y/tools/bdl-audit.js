/**
 * Accessibility audit of the BDL layer: contrast of every colour pair BDL declares, which
 * interactive classes define a focus style, any removed outlines, and dark-mode coverage.
 *
 * Run from the repo root:  node docs/a11y/tools/bdl-audit.js
 *
 * Rules that set a colour but no background are evaluated against the page surface (white), so a
 * rule whose background comes from a parent reads as a false positive — see
 * docs/a11y/accessibility-audit.md §3a for the known one.
 */
const fs = require("fs"), path = require("path");
const DIR = "app/bdl";

// ---- resolve the token maps ----
const read = (f) => fs.readFileSync(path.join(DIR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const vars = {};
for (const f of ["tokens.css", "theme.css"]) {
  if (!fs.existsSync(path.join(DIR, f))) continue;
  const src = read(f);
  // only :root scope (ignore .dark for the light pass)
  const root = src.split(/\.dark\s*\{/)[0];
  for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
}
const resolve = (v, depth = 0) => {
  if (depth > 8 || !v) return v;
  const m = v.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/);
  if (m) return resolve(vars[m[1]] ?? m[2], depth + 1);
  return v;
};
const toHex = (v) => { v = resolve(v); return /^#[0-9a-f]{3,8}$/i.test(v || "") ? v : null; };

// ---- contrast ----
const hx = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2]);
const ratio = (a, b) => { const [x, y] = [L(hx(a)), L(hx(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- walk the component files ----
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".css") && !["tokens.css", "theme.css", "fonts.css", "icons.css"].includes(f));
const textFails = [], noFocus = [], outlineNone = [], darkRules = [];
let pairs = 0;

for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, " "), decl = m[2];
    if (!sel || sel.startsWith("@")) continue;
    if (/\.dark/.test(sel)) darkRules.push(sel);
    if (/outline\s*:\s*(none|0)/.test(decl)) outlineNone.push(`${f}  ${sel}`);
    const fg = toHex((decl.match(/(?:^|[;\s])color\s*:\s*([^;]+)/) || [])[1]);
    const bgRaw = (decl.match(/background(?:-color)?\s*:\s*([^;]+)/) || [])[1];
    const bg = toHex(bgRaw) || (bgRaw && /transparent/.test(bgRaw) ? "#ffffff" : null);
    if (fg && bg) {
      pairs++;
      const r = ratio(fg, bg);
      if (r < 4.5) textFails.push({ f, sel, fg, bg, r });
    } else if (fg && !bgRaw) {
      // text on the page surface
      pairs++;
      const r = ratio(fg, "#ffffff");
      if (r < 4.5) textFails.push({ f, sel, fg, bg: "#ffffff (page)", r });
    }
  }
  // interactive classes lacking a focus-visible style
  for (const m of src.matchAll(/\.(btn[\w-]*|bdl-chip[\w-]*|bdl-tab[\w-]*)\s*\{/g)) {
    const cls = m[1];
    if (!new RegExp(`\\.${cls}[^{]*:focus`).test(src)) noFocus.push(`${f}  .${cls}`);
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`checked ${pairs} colour pairs across ${files.length} BDL component files\n`);
console.log("=== TEXT CONTRAST BELOW 4.5:1 ===");
if (!textFails.length) console.log("  none");
for (const t of [...new Set(textFails.map(JSON.stringify))].map(JSON.parse).sort((a, b) => a.r - b.r))
  console.log(` ${pad(t.r.toFixed(2) + ":1", 9)} ${pad(t.f, 14)} ${pad(t.sel.slice(0, 44), 46)} ${t.fg} on ${t.bg}`);

console.log("\n=== INTERACTIVE CLASSES WITH NO :focus RULE ===");
console.log([...new Set(noFocus)].join("\n") || "  none");
console.log("\n=== outline:none / outline:0 ===");
console.log([...new Set(outlineNone)].join("\n") || "  none");
console.log("\n=== .dark rules inside BDL ===");
console.log(darkRules.length ? [...new Set(darkRules)].join("\n") : "  none — BDL ships no dark mode of its own");
