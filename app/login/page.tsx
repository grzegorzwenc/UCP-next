import type { Metadata } from "next";
import { listUsers } from "@/lib/server/ucp";
import { repo } from "@/lib/repo";
import { Login } from "@/components/shell/Login";
import { PasswordLogin } from "@/components/shell/PasswordLogin";

export const metadata: Metadata = { title: "Sign in · HSBC Unified Content Management" };

/**
 * Sign-in screen. Lives outside (cms) so it has no top bar or side nav; `?next=` (same-origin path only) is where we go afterwards.
 * A real backend (ContentLIBRE) gets a user-name/password form; the mock keeps its demo-account picker.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "";
  const safe = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/login");
  if (repo().kind === "contentlibre") return <PasswordLogin next={safe ? raw : "/"} />;
  const users = await listUsers();
  return <Login users={users} next={safe ? raw : "/uk/prod/dashboard"} demo={sp.demo === "1"} />;
}
