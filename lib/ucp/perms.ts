import type { PermKey, User } from "./types";
import { ROLES } from "./seed";

/**
 * Permission check shared by the UI (hide what you cannot do) and the BFF (refuse what you cannot do).
 * Grants are per top-level folder of a market ("root" = whole site). Folder grants add to root grants.
 * Site admins (manage on root) can do everything.
 */
export const folderKeyOf = (path: string, marketRoot: string) => { const rel = path.startsWith(marketRoot) ? path.slice(marketRoot.length) : path; return rel.split("/").filter(Boolean)[0] ?? "root"; };
export function can(user: Pick<User, "role" | "perms"> | null | undefined, perm: PermKey, path: string, marketRoot: string): boolean {
  if (!user) return false;
  const p = user.perms ?? {}; const root = p.root ?? {};
  if (root.manage || user.role === "admin") return true;
  const key = folderKeyOf(path, marketRoot);
  const own = key !== "root" ? p[key] ?? {} : {};
  if (own[perm] || root[perm]) return true;
  // role defaults apply when no explicit grants exist for the user at all
  return Object.keys(p).length === 0 ? !!ROLES[user.role]?.perms[perm] : false;
}
/** Which permission a status transition needs. */
export const permForStatus: Record<string, PermKey> = { draft: "edit", review: "edit", inreview: "review", reviewed: "review", bizreview: "edit", approved: "review", scheduled: "publish", published: "publish", failed: "publish" };
export const PERM_LABEL: Record<PermKey, string> = { read: "Read", edit: "Edit", review: "Review & approve", publish: "Publish", manage: "Manage" };
