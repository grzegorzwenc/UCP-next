"use client";
import { createContext, useContext } from "react";
import type { User, PermKey } from "@/lib/ucp/types";
import { can } from "@/lib/ucp/perms";

/** Signed-in user for client components. `can(perm, path)` mirrors the BFF guard so the UI hides what the server would refuse. */
const Ctx = createContext<{ user: User; marketRoot: string } | null>(null);
export function SessionProvider({ user, marketRoot, children }: { user: User; marketRoot: string; children: React.ReactNode }) { return <Ctx.Provider value={{ user, marketRoot }}>{children}</Ctx.Provider>; }
export function useSession() {
  const v = useContext(Ctx); if (!v) throw new Error("useSession outside SessionProvider");
  return { user: v.user, marketRoot: v.marketRoot, can: (perm: PermKey, path: string) => can(v.user, perm, path, v.marketRoot) };
}
