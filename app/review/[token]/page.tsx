import type { Metadata } from "next";
import { componentsToBlocks } from "@/lib/repo/mapping";
import { bindingsOf } from "@/lib/ucp/tokens";
import { can } from "@/lib/ucp/perms";
import { sessionUserId } from "@/lib/server/session";
import { listAssets, listComments, me, resolveBindings, reviewByToken, STAGE_LABEL } from "@/lib/server/ucp";
import { ReviewScreen } from "@/components/review/ReviewScreen";
import { backend } from "@/lib/server/pages";
import { clApi } from "@/lib/server/contentlibre";

export const metadata: Metadata = { title: "Review · HSBC Unified Content Management", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Review screen behind a shared link (/review/<token>): the page as customers will see it, plus comments.
 * No UCP account needed to comment (name + e-mail); signed-in reviewers who may approve this stage also get Approve.
 * The link only works while the page is still in the stage it was shared for.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // ContentLIBRE is read as the signed-in person: a link opens after signing in (a guest identity for the BFF is not decided).
  const cl = backend() === "contentlibre";
  if (cl && !(await sessionUserId())) return <ReviewScreen signIn={`/review/${token}`} />;
  const hit = await reviewByToken(token);
  // The page under review is the open draft; its render is what the reviewer reads.
  const draftId = cl && hit ? (await clApi<{ open: { id: string }[] }>("GET", "content/v1/drafts", { path: hit.page.path }).catch(() => ({ open: [] }))).open[0]?.id : undefined;
  if (!hit) return <ReviewScreen missing />;
  const { page, market, link, open } = hit; const meta = page.meta ?? {};
  const [ents, assets, comments, uid] = await Promise.all([resolveBindings(bindingsOf(meta)), listAssets(hit.marketId), listComments(page.path), sessionUserId()]);
  const user = uid ? await me() : null; const admin = !!user && (user.role === "admin" || !!user.perms.root?.manage);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const mayApprove = !!user && open && can(user, "review", page.path, market.root) && (admin || (link.stage === "review"
    ? !str(meta["ucp:assignee"]) || str(meta["ucp:assignee"]) === user.id
    : (meta["ucp:taskKind"] === "BizReview" && str(meta["ucp:taskAssignee"]) ? str(meta["ucp:taskAssignee"]) === user.id : str(meta["ucp:authorReviewedBy"]) !== user.id)));
  return <ReviewScreen token={token} open={open} stage={link.stage} stageLabel={STAGE_LABEL[link.stage]} path={page.path} title={page.title} status={page.status}
    market={{ name: market.name, flag: market.flag, domain: market.domain, route: page.path.replace(market.root, "") || "/" }}
    blocks={componentsToBlocks(page.components ?? [])} previewSrc={cl ? `/api/cl/preview?path=${encodeURIComponent(page.path)}${draftId ? `&draft=${draftId}` : ""}` : undefined} entities={ents} comments={comments} user={user ? { name: user.name } : null} mayApprove={mayApprove}
    /* guests decide only through a link that was sent to them (an e-mail or a group); a copied link is for comments */
    inviteEmail={link.email} canDecide={user ? mayApprove : !!(link.email || link.group)} sentTo={link.email ?? (link.group ? `the ${link.group} group` : undefined)}
    assets={Object.fromEntries(assets.map((a) => [a.id, { data: a.data, alt: a.a11y?.alt?.[market.locales[0]], decorative: a.a11y?.decorative }]))} />;
}
