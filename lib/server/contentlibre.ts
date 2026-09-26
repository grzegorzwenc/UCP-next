import "server-only";
import { cookies } from "next/headers";
import { RepoError } from "@/lib/repo/types";

/**
 * The ContentLIBRE backend, as the BFF talks to it.
 *
 * Every call runs AS THE SIGNED-IN PERSON: sign-in posts to Sling's form login (`j_security_check`), and the
 * `sling.formauth` token it returns is kept in an httpOnly cookie on this origin and replayed on each backend
 * call. The backend then applies that person's own ACLs, and its audit sees them rather than a service account.
 * Writes carry a CSRF token (ContentLIBRE refuses a cookie-authenticated write without one, docs/SECURITY.md §4).
 *
 * CONTENTLIBRE_USER / CONTENTLIBRE_PASSWORD are a development fallback only: with no session cookie the BFF
 * falls back to HTTP Basic as that account, which makes every visitor the same person. Leave them unset
 * anywhere two people share an instance.
 */

/** Holds the backend's `sling.formauth` token for the signed-in person. */
export const CL_SESSION_COOKIE = "ucp-cl-session";
const SLING_AUTH_COOKIE = "sling.formauth";
/** The marker header ContentLIBRE requires on a Basic-authenticated write (docs/SECURITY.md §4). */
const MACHINE_CLIENT = { "X-Requested-With": "ContentLIBRE" };

export type ContentLibreConfig = {
  /** Origin the BFF reaches the backend at, e.g. http://localhost:6727. */
  origin: string;
  /** The Management API root, `<origin>/api/management` unless CONTENTLIBRE_API_URL says otherwise. */
  api: string;
  /** Origin a BROWSER reaches the backend's own tools at (Repository Manager, Swagger); defaults to `origin`. */
  publicOrigin: string;
  user: string;
  pass: string;
};

export function contentLibreConfig(): ContentLibreConfig {
  const trim = (s: string) => s.replace(/\/+$/, "");
  const api = process.env.CONTENTLIBRE_API_URL ? trim(process.env.CONTENTLIBRE_API_URL) : undefined;
  const origin = trim(process.env.CONTENTLIBRE_URL ?? (api ? new URL(api).origin : "http://localhost:6727"));
  return {
    origin,
    api: api ?? `${origin}/api/management`,
    publicOrigin: trim(process.env.CONTENTLIBRE_PUBLIC_URL ?? origin),
    user: process.env.CONTENTLIBRE_USER ?? "",
    pass: process.env.CONTENTLIBRE_PASSWORD ?? "",
  };
}

async function sessionToken(): Promise<string | undefined> {
  try { return (await cookies()).get(CL_SESSION_COOKIE)?.value || undefined; } catch { return undefined; }
}

/** A fresh CSRF token bound to this session. One per write: tokens are cheap and never go stale mid-request. */
async function csrfToken(origin: string, session: string): Promise<string> {
  const res = await fetch(`${origin}/public/csrf`, { headers: { Cookie: `${SLING_AUTH_COOKIE}=${session}`, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new RepoError(res.status, "Could not obtain a CSRF token from ContentLIBRE");
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new RepoError(502, "ContentLIBRE returned no CSRF token");
  return body.token;
}

async function authHeaders(cfg: ContentLibreConfig, method: string): Promise<Record<string, string>> {
  const session = await sessionToken();
  if (session) {
    const headers: Record<string, string> = { Cookie: `${SLING_AUTH_COOKIE}=${session}` };
    if (method !== "GET" && method !== "HEAD") headers["X-CSRF-Token"] = await csrfToken(cfg.origin, session);
    return headers;
  }
  if (cfg.user) return { Authorization: "Basic " + Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64"), ...MACHINE_CLIENT };
  throw new RepoError(401, "Not signed in", "Sign in to ContentLIBRE to continue.");
}

type Problem = { type?: string; title?: string; status?: number; detail?: string; errors?: { field: string; message: string }[] };

/** One Management API call as the signed-in person. `path` is relative to the API root, e.g. `content/v1/page`. */
export async function clApi<T>(method: string, path: string, query: Record<string, string | number | boolean | undefined> = {}, body?: unknown, contentType = "application/json"): Promise<T> {
  const cfg = contentLibreConfig();
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${cfg.api}/${path}${qs ? "?" + qs : ""}`, {
    method,
    headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": contentType } : {}), ...(await authHeaders(cfg, method)) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const rid = res.headers.get("X-Request-Id") ?? undefined;
  if (!res.ok) {
    let p: Problem | undefined; try { p = (await res.json()) as Problem; } catch { /* not a problem document */ }
    const detail = p?.errors?.length ? p.errors.map((e) => `${e.field}: ${e.message}`).join("; ") : p?.detail;
    throw new RepoError(res.status, p?.title ?? res.statusText, detail, rid);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/**
 * Sling form login. Returns the `sling.formauth` token, or throws 401.
 * `j_validate=true` makes Sling answer 200/403 instead of redirecting, and `Origin` is the backend's own because
 * ContentLIBRE's CSRF boundary accepts a login POST only from its own origin.
 */
export async function contentLibreSignIn(username: string, password: string): Promise<string> {
  const cfg = contentLibreConfig();
  const res = await fetch(`${cfg.origin}/j_security_check`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: cfg.origin },
    body: new URLSearchParams({ j_username: username, j_password: password, j_validate: "true" }).toString(),
    redirect: "manual",
    cache: "no-store",
  });
  const token = res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith(`${SLING_AUTH_COOKIE}=`))?.slice(SLING_AUTH_COOKIE.length + 1);
  if (res.status !== 200 || !token) throw new RepoError(401, "Sign-in failed", "The user name or password is not correct.");
  return token;
}

/** Ends the backend session too, so a copied token stops working when the person signs out. Best effort. */
export async function contentLibreSignOut(): Promise<void> {
  const cfg = contentLibreConfig(); const session = await sessionToken();
  if (!session) return;
  await fetch(`${cfg.origin}/system/sling/logout`, { headers: { Cookie: `${SLING_AUTH_COOKIE}=${session}` }, redirect: "manual", cache: "no-store" }).catch(() => undefined);
}

/* ---------------- Management API documents (docs/API-DESIGN.md §10) ---------------- */

export type ClPermissions = { edit: boolean; delete: boolean; createChildren: boolean };
export type ClPage = {
  path: string; name: string; title?: string; description?: string; navTitle?: string; hideInNav?: boolean;
  locale?: string; template?: string; created?: string; lastModified?: string;
  status?: "published" | "modified" | "draft" | "unpublished"; publishedAt?: string; publishedBy?: string;
  openDrafts?: number; hasChildren?: boolean; permissions?: ClPermissions;
};
export type ClPageList = { items: ClPage[]; offset: number; limit: number; more: boolean };
export type ClSiteLocale = { binding: string; locale?: string; contentRoot: string; publicUrl: string; canonical: boolean; readable: boolean };
export type ClSite = { id: string; root?: string; locales: ClSiteLocale[] };
export type ClIdentity = { id: string; authType?: string; groups: string[]; administrator?: boolean };

export const listSites = () => clApi<{ items: ClSite[]; ready: boolean }>("GET", "content/v1/sites");
