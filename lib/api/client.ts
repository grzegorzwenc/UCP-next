import type { Problem } from "./types";
import { ApiError } from "./types";

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Browser-side client. Talks to the Next.js BFF at /api/cl/*, which adds the ContentLIBRE credentials
 * server-side (HTTP Basic + X-Requested-With: ContentLIBRE). No secret ever reaches the browser.
 */
export async function api<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
    : "";
  const h: Record<string, string> = { Accept: "application/json", ...((headers as Record<string, string>) || {}) };
  if (rest.body && !h["Content-Type"]) h["Content-Type"] = "application/json";
  const res = await fetch(`/api/cl${path}${qs}`, { ...rest, headers: h });
  const requestId = res.headers.get("X-Request-Id") ?? undefined;
  if (!res.ok) {
    let problem: Problem = { type: "about:blank", title: res.statusText, status: res.status };
    try { problem = await res.json(); } catch {}
    throw new ApiError(problem, requestId);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
