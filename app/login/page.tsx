import type { Metadata } from "next";
import { listUsers } from "@/lib/server/ucp";
import { Login } from "@/components/shell/Login";

export const metadata: Metadata = { title: "Sign in" };

/** Sign-in screen. Lives outside (cms) so it has no top bar or side nav; `?next=` (same-origin path only) is where we go afterwards. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "";
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/login") ? raw : "/uk/prod/dashboard";
  const users = await listUsers();
  return <Login users={users} next={next} demo={sp.demo === "1"} />;
}
