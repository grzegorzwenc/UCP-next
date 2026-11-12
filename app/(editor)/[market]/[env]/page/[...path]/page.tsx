import { notFound } from "next/navigation";
import { market, env } from "@/lib/markets";
import { getPage } from "@/lib/server/pages";
import { listUsers, listModels, resolveBindings, me } from "@/lib/server/ucp";
import { bindingsOf } from "@/lib/ucp/tokens";
import { Builder } from "@/components/builder/Builder";
import { SessionProvider } from "@/components/shell/Session";

export async function generateMetadata({ params }: PageProps<"/[market]/[env]/page/[...path]">) {
  const { market: mid, path } = await params;
  const page = await getPage([market(mid).root, ...path].join("/"));
  return { title: page?.title ?? "Page builder" };
}

/**
 * How long the "Loading editor" state stays up, at minimum.
 *
 * Deliberate, and asked for: the editor opens fast enough that the skeleton flashed for
 * ~180ms, which reads as a glitch rather than as feedback. This holds it for a beat so the
 * state is actually seen — the same staged open the UCP mock uses.
 *
 * It is a floor, not an addition. The timer starts when the request does and is awaited
 * alongside the fetches, so a slow backend does not pay this on top of its own time; a 3s
 * backend still opens in 3s. A 404 skips it entirely (`notFound()` throws first).
 *
 * To go back to pure data timing, delete this and the `opened` entry in the `Promise.all`.
 */
const MIN_OPEN_MS = 2000;

export default async function PageBuilderRoute({ params, searchParams }: PageProps<"/[market]/[env]/page/[...path]">) {
  const opened = new Promise((r) => setTimeout(r, MIN_OPEN_MS)); // starts now, awaited below
  const { market: mid, env: eid, path } = await params;
  /* ?preview=1 — the Pages card's Preview action opens the page as a visitor sees it. */
  const startInPreview = (await searchParams).preview === "1";
  const mk = market(mid), ev = env(eid);
  const page = await getPage([mk.root, ...path].join("/"));
  if (!page) notFound();
  // Linked content resolves on the server too, so the first paint already shows real values instead of {{tokens}}.
  // `me()` reads the session cookie and belongs here rather than in the layout: runtime data in a
  // layout blocks navigation and suppresses the `loading.tsx` fallback (see the layout's note).
  const [user, users, models, entities] = await Promise.all([me(), listUsers(), listModels(), resolveBindings(bindingsOf(page.meta)).catch(() => ({})), opened]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const contentModels = models.filter((m) => m.group !== "Block types").map((m) => ({ id: m.id, name: m.displayName || m.name, fields: m.fields.filter((f) => !f.hidden).map((f) => ({ k: f.k, l: f.l })) }));
  return (
    <SessionProvider user={user} marketRoot={mk.root}>
      <Builder marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} domain={mk.domain} locale={mk.locales[0]} envName={ev.name} root={mk.root} page={page} startInPreview={startInPreview} names={names} models={contentModels} entities={entities} />
    </SessionProvider>
  );
}
