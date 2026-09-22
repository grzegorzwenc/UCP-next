import type { APIRequestContext, Page } from "@playwright/test";

/** Sign in as a seed user through the SSO stand-in; the session cookie lands in the browser context. */
export async function login(page: Page, id: string) {
  const res = await page.request.post("/api/ucp/login", { data: { id } });
  if (!res.ok()) throw new Error(`login as ${id} failed: ${res.status()} ${await res.text()}`);
}

export const BASE = "/uk/prod";
export const ROOT = "/content/uk";

export async function deletePage(request: APIRequestContext, path: string) {
  await request.delete(`/api/repo/page?path=${encodeURIComponent(path)}&recursive=true`).catch(() => {});
}
