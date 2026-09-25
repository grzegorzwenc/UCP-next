import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Sign-in gate: every CMS screen needs a session cookie; the login page, the APIs and static files do not. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.get("ucp-user")) {
    /* Legacy entity links (`/models?model=…&entity=…`) moved to the Content entities section: answer with a real 307. */
    const legacy = pathname.match(/^\/([^/]+)\/([^/]+)\/models$/);
    if (legacy && request.nextUrl.searchParams.get("entity")) { const to = request.nextUrl.clone(); to.pathname = `/${legacy[1]}/${legacy[2]}/entities`; return NextResponse.redirect(to, 307); }
    return NextResponse.next();
  }
  const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!login|api|_next|favicon.ico|.*\\.svg$|.*\\.png$).*)"] };
