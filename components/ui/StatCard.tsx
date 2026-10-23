import Link from "next/link";
import { Card, CardContent } from "@/components/shadcn/card";

/**
 * A compact KPI card: the number first, its label under it, and a small muted icon that wiggles
 * on hover. Ported from hsbc-ucpmock's "published portfolio" row.
 *
 * The row this replaces was shouting — a 36px number in a 150px-tall box with `p-6`, a 4px
 * coloured top border and a "View pages ›" link under it. The link was redundant (the whole
 * card is one) and the coloured border was a fourth variant of an accent edge the rest of the
 * app had already dropped.
 *
 * `detail` is kept as an optional third line because UCP's figures carry a qualifier the source
 * project's do not ("12 published · 3 in draft"); it sits at the same size as the label so it
 * adds information without adding weight.
 */
export type StatCardProps = {
  value: React.ReactNode;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  detail?: string;
  /** `alert` turns the figure red — a failed publish needs to read as a problem. */
  tone?: "default" | "alert";
};

export function StatCard({ value, label, href, icon: Icon, detail, tone = "default" }: StatCardProps) {
  return (
    <Link href={href} className="group block no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card size="sm" className="h-full py-3 transition-[background-color,box-shadow] duration-160 ease-out group-hover:bg-muted/40 group-hover:shadow-sm">
        <CardContent className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-2xl font-medium leading-none tracking-tight tabular-nums ${tone === "alert" ? "text-crit" : ""}`}>
              {value}
            </p>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
            {detail && <p className="mt-0.5 truncate text-xs text-muted-foreground" title={detail}>{detail}</p>}
          </div>
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors duration-200 ease-out group-hover:animate-(--animate-wiggle) group-hover:text-foreground motion-reduce:animate-none" />
        </CardContent>
      </Card>
    </Link>
  );
}
