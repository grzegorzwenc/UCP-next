import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Sign-in gate: every CMS screen needs a session cookie; the login page, the APIs and static files do not. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.get("ucp-user")) return NextResponse.next();
  const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!login|api|_next|favicon.ico|.*\\.svg$|.*\\.png$).*)"] };
