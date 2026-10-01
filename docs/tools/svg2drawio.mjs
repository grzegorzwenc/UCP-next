// Usage: node docs/tools/svg2drawio.mjs docs/cms-architecture.html <out-dir>
// Converts the page's hand-written SVG diagrams into draw.io (mxGraph) files Gliffy can import, plus standalone SVGs.
// Rects become shapes and the text lines inside them become the shape's label; paths become free edges with
// waypoints; number dots become ellipses; text outside any shape becomes a text cell at its exact position.
import fs from "node:fs";
const SRC = process.argv[2], OUT = process.argv[3];
const html = fs.readFileSync(SRC, "utf8");
fs.mkdirSync(OUT, { recursive: true });

const NAMES = ["01-logical-system", "02-digital-assets-hosting", "03-module-map", "04-flow-inline-edit", "05-flow-review-publish"];
const svgs = html.match(/<svg[\s\S]*?<\/svg>/g);
if (svgs.length !== NAMES.length) throw new Error("expected 5 diagrams, found " + svgs.length);

const CLS = {
  "t-lab": { size: 13, bold: true, color: "#1b2124" }, "t-zone": { size: 14, bold: true, color: "#1b2124" },
  "t-sub": { size: 11.5, color: "#5f6a6e" }, "t-mono": { size: 11, mono: true, color: "#4a5458" },
  "t-edge": { size: 11, color: "#4a5458" }, "t-num": { size: 11, bold: true, color: "#ffffff" },
};
const attrs = (t) => { const o = {}; for (const m of t.matchAll(/([\w:-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const h = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const xa = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r1 = (n) => Math.round(n * 10) / 10;

function textStyle(a) {
  const base = { ...(CLS[a.class] || { size: 11, color: "#1b2124" }) };
  if (a.fill) base.color = a.fill;
  const fs1 = /font-size:\s*([\d.]+)px/.exec(a.style || ""); if (fs1) base.size = +fs1[1];
  const f2 = /font:\s*(\d+)\s+([\d.]+)px/.exec(a.style || ""); if (f2) { base.size = +f2[2]; base.bold = +f2[1] >= 600; }
  return base;
}
const lineHtml = (t) => { let s = h(t.text); if (t.st.bold) s = `<b>${s}</b>`; if (t.st.mono) s = `<font face="Courier New">${s}</font>`; return `<font color="${t.st.color}" style="font-size:${t.st.size}px">${s}</font>`; };
const estW = (t) => Math.ceil(t.text.length * t.st.size * (t.st.mono ? 0.62 : 0.56) + 10);

function convert(svg, name) {
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const items = []; const tr = [];
  const re = /<rect\b[^>]*\/?>|<text\b([^>]*)>([\s\S]*?)<\/text>|<path\b[^>]*\/?>|<use\b[^>]*\/?>|<g\b[^>]*>|<\/g>|<circle\b[^>]*\/?>/g;
  for (const m of body.matchAll(re)) {
    const tag = m[0];
    const off = tr.reduce((p, c) => [p[0] + c[0], p[1] + c[1]], [0, 0]);
    if (tag.startsWith("<g")) { const t = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(tag); tr.push(t ? [+t[1], +t[2]] : [0, 0]); continue; }
    if (tag === "</g>") { tr.pop(); continue; }
    if (tag.startsWith("<svg")) continue;
    if (tag.startsWith("<rect")) { const a = attrs(tag); items.push({ k: "rect", x: +a.x + off[0], y: +a.y + off[1], w: +a.width, h: +a.height, a, texts: [] }); }
    else if (tag.startsWith("<text")) { const a = attrs(m[1]); items.push({ k: "text", x: +(a.x || 0) + off[0], y: +(a.y || 0) + off[1], anchor: a["text-anchor"] || "start", text: decode(m[2].trim()), st: textStyle(a), cls: a.class }); }
    else if (tag.startsWith("<path")) { const a = attrs(tag); items.push({ k: "path", a }); }
    else if (tag.startsWith("<use")) { const a = attrs(tag); items.push({ k: "dot", x: +a.x, y: +a.y }); }
    else if (tag.startsWith("<circle")) { const a = attrs(tag); items.push({ k: "dot", x: +(a.cx || 0) + off[0], y: +(a.cy || 0) + off[1], r: +a.r, fill: a.fill }); }
  }
  const rects = items.filter((i) => i.k === "rect"), dots = items.filter((i) => i.k === "dot");
  // numbers onto dots
  for (const t of items.filter((i) => i.k === "text" && i.cls === "t-num")) {
    const d = dots.find((d) => Math.abs(d.x - t.x) < 4 && Math.abs(d.y - (t.y - 4)) < 6);
    if (d) { d.label = t.text; t.used = true; }
  }
  // texts into the innermost rect containing their anchor point
  for (const t of items.filter((i) => i.k === "text" && !i.used)) {
    const px = t.anchor === "end" ? t.x - 2 : t.x, py = t.y - 4;
    const inside = rects.filter((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h).sort((a, b) => a.w * a.h - b.w * b.h);
    if (inside[0]) inside[0].texts.push(t);
  }
  // a rect's label is its first run of lines; same-baseline neighbours join one line; anything else stays free
  for (const r of rects) {
    const lines = []; let prev = null;
    for (const t of r.texts) {
      if (prev && Math.abs(t.y - prev.y) < 2 && t.x - prev.x < 150) { lines[lines.length - 1].push(t); t.used = true; prev = t; continue; }
      if (prev && (Math.abs(t.y - prev.y) < 2 || t.y - prev.y > 24 || t.y < prev.y)) continue;
      lines.push([t]); t.used = true; prev = t;
    }
    r.lines = lines;
  }

  let id = 2; const cells = [];
  const geo = (x, y, w, hh) => `<mxGeometry x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(hh)}" as="geometry"/>`;
  for (const it of items) {
    if (it.k === "rect") {
      const a = it.a, first = it.lines[0]?.[0];
      let st = `rounded=${a.rx ? 1 : 0};absoluteArcSize=1;arcSize=${(+a.rx || 0) * 2};whiteSpace=wrap;html=1;fillColor=${a.fill === "none" ? "none" : a.fill || "#ffffff"};strokeColor=${a.stroke || "none"};strokeWidth=${a["stroke-width"] || 1};verticalAlign=top;fontFamily=Helvetica;`;
      if (a["stroke-dasharray"]) st += "dashed=1;";
      let label = "";
      if (first) {
        if (first.anchor === "middle") st += "align=center;spacingLeft=0;spacingRight=0;";
        else if (first.anchor === "end") st += `align=right;spacingRight=${r1(it.x + it.w - first.x)};`;
        else st += `align=left;spacingLeft=${r1(first.x - it.x)};`;
        if (it.h < 24) st = st.replace("verticalAlign=top;", "verticalAlign=middle;") + "spacing=0;"; else st += `spacingTop=${r1(Math.max(0, first.y - first.st.size - it.y - 2))};spacing=0;`;
        label = it.lines.map((ln) => ln.map(lineHtml).join("&nbsp;&nbsp;&nbsp;")).join("<br>");
      }
      cells.push(`<mxCell id="${id++}" value="${xa(label)}" style="${st}" vertex="1" parent="1">${geo(it.x, it.y, it.w, it.h)}</mxCell>`);
    } else if (it.k === "text" && !it.used) {
      const w = estW(it), x = it.anchor === "middle" ? it.x - w / 2 : it.anchor === "end" ? it.x - w : it.x - 2;
      const al = it.anchor === "middle" ? "center" : it.anchor === "end" ? "right" : "left";
      cells.push(`<mxCell id="${id++}" value="${xa(lineHtml(it))}" style="text;html=1;whiteSpace=nowrap;align=${al};verticalAlign=middle;spacing=0;spacingLeft=2;fontFamily=Helvetica;" vertex="1" parent="1">${geo(x, it.y - it.st.size - 1, w, it.st.size + 6)}</mxCell>`);
    } else if (it.k === "path") {
      const a = it.a;
      for (const seg of a.d.trim().split(/(?=M)/)) {
        const pts = []; let cx = 0, cy = 0;
        for (const c of seg.matchAll(/([MLHV])\s*([-\d.]+)(?:[ ,]+([-\d.]+))?/g)) {
          if (c[1] === "M" || c[1] === "L") { cx = +c[2]; cy = +c[3]; } else if (c[1] === "H") cx = +c[2]; else cy = +c[2];
          pts.push([cx, cy]);
        }
        if (pts.length < 2) continue;
        const end = a["marker-end"] ? "block" : "none", start = a["marker-start"] ? "block" : "none";
        let st = `edgeStyle=none;rounded=0;html=1;endArrow=${end};endFill=1;startArrow=${start};startFill=1;endSize=6;startSize=6;strokeColor=${a.stroke || "#4a5458"};strokeWidth=${a["stroke-width"] || 1};`;
        if (a["stroke-dasharray"]) st += `dashed=1;dashPattern=${a["stroke-dasharray"].replace(/,/g, " ")};`;
        const mid = pts.slice(1, -1).map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("");
        const [sx, sy] = pts[0], [tx, ty] = pts[pts.length - 1];
        cells.push(`<mxCell id="${id++}" value="" style="${st}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${sx}" y="${sy}" as="sourcePoint"/><mxPoint x="${tx}" y="${ty}" as="targetPoint"/>${mid ? `<Array as="points">${mid}</Array>` : ""}</mxGeometry></mxCell>`);
      }
    } else if (it.k === "dot") {
      const r = it.r || 9;
      cells.push(`<mxCell id="${id++}" value="${xa(it.label ? `<b>${h(it.label)}</b>` : "")}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${it.fill || "#2b3338"};strokeColor=none;fontColor=#ffffff;fontSize=10;align=center;verticalAlign=middle;spacing=0;fontFamily=Helvetica;" vertex="1" parent="1">${geo(it.x - r, it.y - r, 2 * r, 2 * r)}</mxCell>`);
    }
  }
  const W = vb ? vb[1] : 1200, H = vb ? vb[2] : 800;
  const xml = `<mxfile host="Electron" type="device"><diagram id="${name}" name="${name}"><mxGraphModel dx="${W}" dy="${H}" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>\n`;
  fs.writeFileSync(`${OUT}/${name}.drawio`, xml);

  // standalone SVG: the page's CSS for SVG text classes travels with it
  const style = `<style>text{font-family:"IBM Plex Sans","Segoe UI",Arial,sans-serif;fill:#1b2124}.t-lab{font:600 13px "IBM Plex Sans Condensed","Arial Narrow",Arial,sans-serif}.t-zone{font:600 14px "IBM Plex Sans Condensed","Arial Narrow",Arial,sans-serif}.t-sub{font-size:11.5px;fill:#5f6a6e}.t-mono{font:11px "IBM Plex Mono",Consolas,"Courier New",monospace;fill:#4a5458}.t-edge{font-size:11px;fill:#4a5458}.t-num{font:600 11px "IBM Plex Sans Condensed",Arial,sans-serif;fill:#ffffff}</style>`;
  const solo = svg.replace(/<svg /, `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/var\(--display\)/g, "'IBM Plex Sans Condensed', Arial, sans-serif").replace(/(<svg[^>]*>)/, `$1${style}<rect width="100%" height="100%" fill="#ffffff"/>`);
  fs.writeFileSync(`${OUT}/${name}.svg`, solo);
  return { name, cells: cells.length, rects: rects.length, free: items.filter((i) => i.k === "text" && !i.used).length };
}
console.log(svgs.map((s, i) => convert(s, NAMES[i])));
