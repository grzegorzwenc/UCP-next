import { ApiError } from "./types";

export type ErrorInfo = { title: string; detail?: string; requestId?: string; forbidden: boolean };

/** Turn anything thrown by the BFF client into copy the UI can show. 403s read as "You can't do that here: …". */
export function describeError(e: unknown): ErrorInfo {
  if (e instanceof ApiError) {
    const forbidden = e.problem.status === 403;
    return { title: forbidden ? `You can't do that here: ${e.problem.title}` : e.problem.title || `HTTP ${e.problem.status}`, detail: e.problem.detail, requestId: e.requestId, forbidden };
  }
  if (e instanceof Error) return { title: e.message || "Something went wrong", forbidden: false };
  return { title: typeof e === "string" && e ? e : "Something went wrong", forbidden: false };
}

/** One-line version for toasts: "<title>. <detail> · request <id>". */
export function errorText(e: unknown): string {
  const d = describeError(e);
  return `${d.title}${d.detail ? `. ${d.detail}` : ""}${d.requestId ? ` · request ${d.requestId}` : ""}`;
}
