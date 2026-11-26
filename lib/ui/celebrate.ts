/**
 * The moment after "Publish now": a full-screen ceremony — the release steps tick past, then the
 * page is declared live and HSBC-coloured confetti goes off.
 *
 * Plain DOM + canvas, no library and no React, so it can be fired from anywhere (it is called from
 * the publish dialog, which unmounts itself on success). It removes itself on a click, on Escape,
 * or by itself a few seconds after the confetti.
 *
 * Publishing is seen a handful of times a day at most, and this is the end of a long workflow —
 * review, business sign-off, scheduling — so it is one of the few places in the app that may take a
 * moment to be pleased with itself. Everything still lands inside ~2.2s, entrances use BDL's
 * `--ease-out`, and nothing animates but `transform` and `opacity`.
 *
 * The steps are a progress *narrative*, not instrumentation: the publish call has already returned
 * by the time this runs, so they are paced for reading rather than reporting real timings.
 */
const COLOURS = ["#DB0011", "#A8000B", "#FFFFFF", "#0F1013", "#F5A623", "#00847F", "#E6E6E6"];
const EASE = "cubic-bezier(.23,1,.32,1)"; // BDL --ease-out
/** Each line of the release, in the order a deployment actually happens. */
const STEPS = ["Bundling the page", "Uploading images and files", "Pushing to the CDN", "Clearing the edge cache", "Checking it responds"];
const STEP_MS = 380;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CSS = `
#ucp-fanfare .fan-scrim { position:absolute; inset:0; background:rgba(15,16,19,.72); opacity:0; transition:opacity .22s ${EASE}; }
#ucp-fanfare.fan-in .fan-scrim { opacity:1; }
@supports (backdrop-filter: blur(4px)) { #ucp-fanfare .fan-scrim { backdrop-filter:blur(3px); } }
#ucp-fanfare .fan-card { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.96); opacity:0;
  transition:transform .24s ${EASE}, opacity .2s ${EASE}; pointer-events:auto; background:#fff;
  box-shadow:0 30px 80px rgba(0,0,0,.42); padding:28px 32px 24px; text-align:center; width:min(420px,calc(100vw - 32px)); }
#ucp-fanfare.fan-in .fan-card { transform:translate(-50%,-50%) scale(1); opacity:1; }
#ucp-fanfare .fan-bar { height:2px; background:#E6E6E6; margin:0 -32px 22px; overflow:hidden; }
#ucp-fanfare .fan-bar i { display:block; height:100%; background:#DB0011; transform:scaleX(0); transform-origin:left;
  transition:transform ${STEP_MS}ms linear; }
#ucp-fanfare .fan-step { display:flex; align-items:center; gap:10px; padding:5px 0; font-size:13px; color:#767676;
  opacity:0; transform:translateY(6px); transition:opacity .22s ${EASE}, transform .22s ${EASE}, color .2s ease; }
#ucp-fanfare .fan-step.on { opacity:1; transform:none; }
#ucp-fanfare .fan-step.now { color:#333; }
#ucp-fanfare .fan-step.done { color:#767676; }
#ucp-fanfare .fan-mark { width:16px; height:16px; flex:none; display:grid; place-items:center; }
#ucp-fanfare .fan-spin { width:13px; height:13px; border:2px solid rgba(219,0,17,.22); border-top-color:#DB0011; border-radius:50%;
  animation:fan-spin .7s linear infinite; }
@keyframes fan-spin { to { transform:rotate(360deg); } }
#ucp-fanfare .fan-tick path { stroke-dasharray:24; stroke-dashoffset:24; animation:fan-draw .22s ${EASE} forwards; }
@keyframes fan-draw { to { stroke-dashoffset:0; } }
#ucp-fanfare .fan-swap { transition:opacity .18s ${EASE}, transform .18s ${EASE}; }
#ucp-fanfare .fan-swap.out { opacity:0; transform:translateY(-6px); }
#ucp-fanfare .fan-win { opacity:0; transform:translateY(8px); transition:opacity .26s ${EASE}, transform .26s ${EASE}; }
#ucp-fanfare .fan-win.on { opacity:1; transform:none; }
#ucp-fanfare .fan-ring { width:60px; height:60px; margin:0 auto; border-radius:50%; background:#DB0011; display:grid; place-items:center;
  box-shadow:0 0 0 8px rgba(219,0,17,.12); transform:scale(.92); transition:transform .22s ${EASE}; }
#ucp-fanfare .fan-win.on .fan-ring { transform:scale(1); }
#ucp-fanfare .fan-btn { margin-top:18px; width:100%; }
@media (prefers-reduced-motion: reduce) {
  /* The card's transform is what centres it, so it keeps that and loses only the scale. */
  #ucp-fanfare .fan-card { transition:opacity .2s ease; transform:translate(-50%,-50%) !important; }
  #ucp-fanfare .fan-step, #ucp-fanfare .fan-win, #ucp-fanfare .fan-ring, #ucp-fanfare .fan-swap { transition:opacity .2s ease; transform:none !important; }
  #ucp-fanfare .fan-spin { animation:none; border-top-color:rgba(219,0,17,.22); }
  #ucp-fanfare .fan-tick path { animation:none; stroke-dashoffset:0; }
  #ucp-fanfare .fan-bar i { transition:none; }
}
`;

const TICK = (size: number, colour: string, cls = "") =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

export function celebrate(titles: string[], where = "", onClose?: () => void) {
  if (typeof window === "undefined") return;
  document.getElementById("ucp-fanfare")?.remove();
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const one = titles.length === 1;
  const what = one ? `<b>${esc(titles[0])}</b> is live` : `<b>${titles.length} pages</b> are live`;

  const root = document.createElement("div");
  root.id = "ucp-fanfare";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.style.cssText = "position:fixed;inset:0;z-index:200;pointer-events:none;font-family:inherit;";
  const style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);

  const scrim = document.createElement("div"); scrim.className = "fan-scrim"; scrim.style.pointerEvents = "auto"; root.appendChild(scrim);
  const canvas = document.createElement("canvas"); canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  if (!calm) root.appendChild(canvas);

  const card = document.createElement("div"); card.className = "fan-card";
  card.innerHTML = `<div class="fan-bar"><i></i></div>
    <div class="fan-swap" style="text-align:left">
      <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:10px;text-align:center">Publishing${where ? ` to ${esc(where)}` : ""}</div>
      ${STEPS.map((s) => `<div class="fan-step"><span class="fan-mark"></span><span>${s}</span></div>`).join("")}
    </div>
    <div class="fan-win" hidden>
      <div class="fan-ring">${TICK(30, "#fff")}</div>
      <div style="margin-top:14px;font-size:26px;font-weight:700;color:var(--foreground)">Published!</div>
      <div style="margin-top:4px;font-size:15px;color:#333">${what}${where ? ` on ${esc(where)}` : ""}</div>
      <div style="margin-top:6px;font-size:12px;color:#767676">Customers can see it now.</div>
      <button type="button" class="btn btn-sm btn-primary fan-btn">Close</button>
    </div>`;
  root.appendChild(card);
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add("fan-in"));

  const steps = [...card.querySelectorAll<HTMLElement>(".fan-step")];
  const bar = card.querySelector<HTMLElement>(".fan-bar i")!;
  const swap = card.querySelector<HTMLElement>(".fan-swap")!;
  const win = card.querySelector<HTMLElement>(".fan-win")!;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

  let alive = true;
  let raf = 0;
  const close = () => {
    if (!alive) return; alive = false;
    timers.forEach(clearTimeout); cancelAnimationFrame(raf);
    root.classList.remove("fan-in");
    root.style.transition = "opacity .3s"; root.style.opacity = "0";
    document.removeEventListener("keydown", onKey);
    /* After the card has gone, not before: the caller usually navigates away, and doing that under a
       still-visible overlay shows the next screen through it. */
    setTimeout(() => { root.remove(); onClose?.(); }, 320);
  };
  function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("click", close);
  card.querySelector(".fan-btn")!.addEventListener("click", close);

  /* The steps: each one appears, spins while it is the current one, then keeps a tick. */
  const pace = calm ? 90 : STEP_MS;
  steps.forEach((row, i) => {
    later(() => {
      row.classList.add("on", "now");
      row.querySelector(".fan-mark")!.innerHTML = `<span class="fan-spin"></span>`;
      bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
      const prev = steps[i - 1];
      if (prev) { prev.classList.remove("now"); prev.classList.add("done"); prev.querySelector(".fan-mark")!.innerHTML = TICK(15, "#00847F", "fan-tick"); }
    }, i * pace);
  });

  /* Then the page is live: the list gives way to the headline, and the confetti goes off with it. */
  const winAt = steps.length * pace + (calm ? 120 : 260);
  later(() => {
    const last = steps[steps.length - 1];
    last.classList.remove("now"); last.classList.add("done");
    last.querySelector(".fan-mark")!.innerHTML = TICK(15, "#00847F", "fan-tick");
    swap.classList.add("out");
    later(() => {
      swap.hidden = true; win.hidden = false;
      requestAnimationFrame(() => win.classList.add("on"));
      if (!calm) confetti();
      later(close, calm ? 3200 : 5200);
    }, 180);
  }, winAt);

  /* ---- confetti: two bursts up from the bottom corners, then a light fall from above ---- */
  function confetti() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);
    type P = { x: number; y: number; vx: number; vy: number; r: number; w: number; h: number; c: string; spin: number; round: boolean };
    const bits: P[] = [];
    const burst = (x: number, dir: number, n: number) => { for (let i = 0; i < n; i++) bits.push({ x, y: H + 10, vx: dir * (2.5 + Math.random() * 9), vy: -(13 + Math.random() * 11), r: Math.random() * Math.PI, w: 6 + Math.random() * 7, h: 8 + Math.random() * 10, c: COLOURS[(Math.random() * COLOURS.length) | 0], spin: (Math.random() - .5) * .35, round: Math.random() < .25 }); };
    burst(W * 0.1, 1, 110); burst(W * 0.9, -1, 110);
    later(() => { for (let i = 0; i < 90; i++) bits.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * Math.PI, w: 6 + Math.random() * 6, h: 8 + Math.random() * 9, c: COLOURS[(Math.random() * COLOURS.length) | 0], spin: (Math.random() - .5) * .3, round: Math.random() < .25 }); }, 450);
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
}
