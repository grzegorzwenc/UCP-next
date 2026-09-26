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

/* ---------------- the editor's own Sling contracts (AUTHORING-DESIGN.md, EDITOR-PLATFORM-DESIGN.md) ----------------
 * Components are read and written the way ContentLIBRE's editor does it: `.libre-model.json` for structure, allowed
 * types and fields; Sling POST for insert / properties / delete, `libre:moveComponent` for moves. Every write goes
 * through the backend's composition validator and publication rules, as the signed-in person. */

/** Only content and draft payloads are reachable through these helpers: the BFF must not become a generic repository proxy. */
export function isEditablePath(path: string): boolean {
  return /^\/(content|var\/pages\/drafts\/content)\/[^\s?#]+$/.test(path) && !path.split("/").some((s) => s === ".." || s === ".");
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** GET a Sling JSON rendering (e.g. `<node>.libre-model.json`, `<node>.json`) as the signed-in person. */
export async function clSlingJson<T>(pathWithExtension: string): Promise<T> {
  const cfg = contentLibreConfig();
  const res = await fetch(`${cfg.origin}${encodePath(pathWithExtension)}`, { headers: { Accept: "application/json", ...(await authHeaders(cfg, "GET")) }, cache: "no-store" });
  if (!res.ok) throw new RepoError(res.status, res.status === 404 ? "Not found" : res.statusText, pathWithExtension);
  return (await res.json()) as T;
}

/** One Sling POST (form-encoded) as the signed-in person. Refusals carry the backend's own message (validator, publication rules). */
export async function clSlingPost(path: string, entries: [string, string][]): Promise<{ message?: string }> {
  const cfg = contentLibreConfig();
  const body = new URLSearchParams(); for (const [k, v] of entries) body.append(k, v);
  const res = await fetch(`${cfg.origin}${encodePath(path)}`, {
    method: "POST", body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...(await authHeaders(cfg, "POST")) },
    cache: "no-store",
  });
  let answer: { "status.message"?: string; error?: { message?: string } } = {};
  try { answer = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new RepoError(res.status, "Refused by ContentLIBRE", answer.error?.message ?? answer["status.message"] ?? res.statusText);
  return { message: answer["status.message"] };
}

/** A multipart Sling POST (file uploads) as the signed-in person. */
export async function clSlingPostMultipart(path: string, form: FormData): Promise<void> {
  const cfg = contentLibreConfig();
  const res = await fetch(`${cfg.origin}${encodePath(path)}`, { method: "POST", body: form, headers: { Accept: "application/json", ...(await authHeaders(cfg, "POST")) }, cache: "no-store" });
  if (!res.ok) { let answer: { error?: { message?: string }; "status.message"?: string } = {}; try { answer = await res.json(); } catch { /* not JSON */ } throw new RepoError(res.status, "Refused by ContentLIBRE", answer.error?.message ?? answer["status.message"] ?? res.statusText); }
}

/** GET a Sling JSON rendering, or `undefined` when there is nothing the caller can see there. */
export async function clSlingJsonOrNone<T>(pathWithExtension: string): Promise<T | undefined> {
  try { return await clSlingJson<T>(pathWithExtension); } catch (e) { if (e instanceof RepoError && e.status === 404) return undefined; throw e; }
}

/**
 * The server's own render of a page (or of one of its drafts) for the builder's preview. A `<base>` pointing at the
 * backend's public origin makes the page's stylesheets, scripts and images load from the backend directly - they are
 * public - and keeps the preview byte-for-byte the backend's render: one renderer, not a second one here.
 */
export async function clRender(pagePath: string, draft?: string): Promise<string> {
  const cfg = contentLibreConfig();
  const res = await fetch(`${cfg.origin}${encodePath(pagePath)}.html${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`, { headers: { Accept: "text/html", ...(await authHeaders(cfg, "GET")) }, cache: "no-store" });
  if (!res.ok) throw new RepoError(res.status, "The page could not be rendered", pagePath);
  const html = await res.text();
  const base = `<base href="${cfg.publicOrigin}/" target="_blank">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`) : base + html;
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
/** The review of the newest open draft (content/v1). `OUTDATED`: approved, then changed - it must be reviewed again. */
export type ClReview = {
  state: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "OUTDATED"; requestedBy?: string; requestedAt?: string; assignee?: string;
  due?: string; note?: string; decidedBy?: string; decidedAt?: string; comment?: string;
};
export type ClPage = {
  path: string; name: string; title?: string; description?: string; navTitle?: string; hideInNav?: boolean;
  locale?: string; template?: string; created?: string; lastModified?: string;
  status?: "published" | "modified" | "draft" | "unpublished"; publishedAt?: string; publishedBy?: string;
  openDrafts?: number; hasChildren?: boolean; permissions?: ClPermissions; review?: ClReview;
};
export type ClPageList = { items: ClPage[]; offset: number; limit: number; more: boolean };
export type ClSiteLocale = { binding: string; locale?: string; contentRoot: string; publicUrl: string; canonical: boolean; readable: boolean };
export type ClSite = { id: string; root?: string; locales: ClSiteLocale[] };
export type ClIdentity = { id: string; authType?: string; groups: string[]; administrator?: boolean };

export const listSites = () => clApi<{ items: ClSite[]; ready: boolean }>("GET", "content/v1/sites");
