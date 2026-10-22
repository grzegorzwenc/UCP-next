/**
 * Fanfare after "Publish now": HSBC-coloured confetti over the whole screen and a big "Published!" card.
 * Plain DOM + canvas (no library); removes itself after a few seconds or on a click. Reduced motion: only the card.
 */
const COLOURS = ["#DB0011", "#A8000B", "#FFFFFF", "#0F1013", "#F5A623", "#00847F", "#E6E6E6"];

export function celebrate(titles: string[], where = "") {
  if (typeof window === "undefined") return;
  document.getElementById("ucp-fanfare")?.remove();
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div"); root.id = "ucp-fanfare";
  root.setAttribute("role", "status"); root.setAttribute("aria-live", "polite");
  root.style.cssText = "position:fixed;inset:0;z-index:200;pointer-events:none;";
  const canvas = document.createElement("canvas"); canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  if (!calm) root.appendChild(canvas);

  const one = titles.length === 1;
  const card = document.createElement("div");
  card.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9);opacity:0;transition:transform .35s cubic-bezier(.2,1.4,.4,1),opacity .25s;pointer-events:auto;cursor:pointer;background:#fff;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.35);padding:30px 40px 26px;text-align:center;font-family:inherit;max-width:min(460px,calc(100vw - 32px));";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  card.innerHTML = `<div style="width:64px;height:64px;margin:0 auto;border-radius:50%;background:#DB0011;display:grid;place-items:center;box-shadow:0 0 0 8px rgba(219,0,17,.12)">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <div style="margin-top:14px;font-size:26px;font-weight:700;color:var(--foreground)">Published!</div>
    <div style="margin-top:4px;font-size:15px;color:#333">${one ? `<b>${esc(titles[0])}</b> is live` : `<b>${titles.length} pages</b> are live`}${where ? ` on ${esc(where)}` : ""}</div>
    <div style="margin-top:12px;font-size:12px;color:#767676">Customers see it now · click to close</div>`;
  root.appendChild(card); document.body.appendChild(root);
  requestAnimationFrame(() => { card.style.opacity = "1"; card.style.transform = "translate(-50%,-50%) scale(1)"; });

  let raf = 0; let alive = true;
  const close = () => { if (!alive) return; alive = false; cancelAnimationFrame(raf); card.style.opacity = "0"; card.style.transform = "translate(-50%,-50%) scale(.95)"; root.style.transition = "opacity .3s"; root.style.opacity = "0"; setTimeout(() => root.remove(), 320); };
  card.addEventListener("click", close); setTimeout(close, calm ? 3500 : 5200);
  if (calm) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1); const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);
  type P = { x: number; y: number; vx: number; vy: number; r: number; w: number; h: number; c: string; spin: number; round: boolean };
  const bits: P[] = [];
  const burst = (x: number, dir: number, n: number) => { for (let i = 0; i < n; i++) bits.push({ x, y: H + 10, vx: dir * (2.5 + Math.random() * 9), vy: -(13 + Math.random() * 11), r: Math.random() * Math.PI, w: 6 + Math.random() * 7, h: 8 + Math.random() * 10, c: COLOURS[(Math.random() * COLOURS.length) | 0], spin: (Math.random() - .5) * .35, round: Math.random() < .25 }); }; // from the bottom corners, up and inwards
  burst(W * 0.1, 1, 110); burst(W * 0.9, -1, 110);
  setTimeout(() => { for (let i = 0; i < 90; i++) bits.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * Math.PI, w: 6 + Math.random() * 6, h: 8 + Math.random() * 9, c: COLOURS[(Math.random() * COLOURS.length) | 0], spin: (Math.random() - .5) * .3, round: Math.random() < .25 }); }, 450);
  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of bits) {
      p.vy += 0.32; p.vx *= 0.985; if (p.vy > 0) p.vy = Math.min(p.vy, 4.5); /* fall gently once they turn */ p.x += p.vx + Math.sin(p.r) * 0.6; p.y += p.vy; p.r += p.spin;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; if (p.c === "#FFFFFF") { ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1; }
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r))); if (p.c === "#FFFFFF") ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r))); }
      ctx.restore();
    }
    if (alive && bits.some((p) => p.y < H + 30)) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
