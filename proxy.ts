import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 1. Demo gate: when DEMO_PASSWORD is set (hosted demo), every request needs HTTP Basic auth, so the prototype is never public.
 * 2. Sign-in gate: every CMS screen needs a session cookie; the login page, the APIs and static files do not.
 */
export function proxy(request: NextRequest) {
  const pass = process.env.DEMO_PASSWORD;
  if (pass) {
    const h = request.headers.get("authorization") ?? "";
    let ok = false; try { ok = h.startsWith("Basic ") && atob(h.slice(6)) === `${process.env.DEMO_USER || "demo"}:${pass}`; } catch { ok = false; }
    if (!ok) return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="UCP demo", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" } });
  }
  const { pathname, search } = request.nextUrl;
  const noindex = (r: NextResponse) => { if (pass) r.headers.set("X-Robots-Tag", "noindex, nofollow"); return r; };
  if (pathname === "/login" || pathname.startsWith("/api/")) return noindex(NextResponse.next());
  if (request.cookies.get("ucp-user")) {
    /* Legacy entity links (`/models?model=…&entity=…`) moved to the Content entities section: answer with a real 307. */
    const legacy = pathname.match(/^\/([^/]+)\/([^/]+)\/models$/);
    if (legacy && request.nextUrl.searchParams.get("entity")) { const to = request.nextUrl.clone(); to.pathname = `/${legacy[1]}/${legacy[2]}/entities`; return NextResponse.redirect(to, 307); }
    return noindex(NextResponse.next());
  }
  const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)"] };
