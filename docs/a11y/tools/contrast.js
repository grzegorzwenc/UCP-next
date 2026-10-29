/**
 * WCAG contrast for the specific pairs this branch introduced, in both themes. Edit the `rows`
 * table to add a pair; each entry is [name, foreground, background, mode, required ratio].
 *
 * Run from the repo root:  node docs/a11y/tools/contrast.js
 */
const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => { const [x, y] = [L(hex(a)), L(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// blend fg over bg at alpha
const over = (fg, bg, a) => { const f = hex(fg), b = hex(bg); return "#" + f.map((c, i) => Math.round(c * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join(""); };

const rows = [
  ["bulk-bar button text", "#ffffff", "#333333", "light", 4.5],
  ["bulk-bar button text", "#ffffff", "#f1f4f8", "dark",  4.5],
  ["bulk-bar separator 40%", over("#ffffff", "#f1f4f8", 0.4), "#f1f4f8", "dark", 3.0],
  ["bulk-bar note 60%",      over("#ffffff", "#f1f4f8", 0.6), "#f1f4f8", "dark", 4.5],
  ["--ink-3 on surface", "#767676", "#ffffff", "light", 4.5],
  ["--ink-3 on surface", "#a6b1bf", "#151d2a", "dark",  4.5],
  ["--ink-3 on surface-2", "#767676", "#f9f9f9", "light", 4.5],
  ["--ink-4 (tree counts)", "#909090", "#ffffff", "light", 4.5],
  ["--ink-4 (tree counts)", "#a6b1bf", "#151d2a", "dark",  4.5],
  ["palette footer 11px", "#a6b1bf", "#19222e", "dark", 4.5],
  ["palette footer 11px", "#767676", "#ffffff", "light", 4.5],
  ["quick-chip count 70% (active)", over("#151d2a", "#f1f4f8", 0.7), "#f1f4f8", "dark", 4.5],
  ["quick-chip count 70% (active)", over("#ffffff", "#333333", 0.7), "#333333", "light", 4.5],
  ["up-tile text --ink-3", "#767676", "#ffffff", "light", 4.5],
  ["--border as a divider", "#cccccc", "#ffffff", "light", 3.0],
];
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("pair", 32), pad("mode", 6), pad("ratio", 8), pad("needs", 6), "verdict");
for (const [name, fg, bg, mode, need] of rows) {
  const r = ratio(fg, bg);
  console.log(pad(name, 32), pad(mode, 6), pad(r.toFixed(2) + ":1", 8), pad(need + ":1", 6), r >= need ? "pass" : "FAIL");
}
