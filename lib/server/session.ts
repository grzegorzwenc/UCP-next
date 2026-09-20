import "server-only";
import { cookies } from "next/headers";

/**
 * Who is signed in. Stand-in for company SSO: the login page sets an httpOnly cookie with the user id.
 * With a real Sling backend the identity comes from the backend session instead (see repo().identity()).
 */
export const SESSION_COOKIE = "ucp-user";
export async function sessionUserId(): Promise<string | null> { try { return (await cookies()).get(SESSION_COOKIE)?.value ?? null; } catch { return null; } }
