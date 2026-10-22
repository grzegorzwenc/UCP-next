import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/shadcn/card";

/**
 * A "start something" card: icon tile, title, one line of help, and an "Explore →" that fades
 * and slides in on hover. Ported from hsbc-ucpmock's home quick-actions and kept here rather
 * than inline so section landings can reuse it.
 *
 * `primary` fills the card with HSBC red for the one action a screen wants to lead with.
 * Everything else hovers to a neutral tint — note `bg-muted`, not `bg-brand`: in this app
 * --brand is HSBC red, where in the source project it is a grey.
 */
export type ActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
  /** Overrides the default "Explore" reveal label. */
  exploreLabel?: string;
};

export function ActionCard({ title, description, href, icon: Icon, primary = false, exploreLabel = "Explore" }: ActionCardProps) {
  return (
    <Link href={href} className="group block no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card
        size="sm"
        className={`h-full py-5 transition-[background-color,box-shadow] duration-160 ease-out group-hover:shadow-sm ${
          primary ? "bg-brand border-brand text-white" : "group-hover:bg-muted/40"
        }`}
      >
        <CardContent className="flex h-full flex-col gap-4">
          <div className={`flex size-10 items-center justify-center rounded-md ${
            primary ? "bg-white/20 text-white" : "bg-(--sidebar-active) text-bdl-red dark:text-(--sidebar-active-bar)"
          }`}>
            <Icon className="size-5 group-hover:animate-(--animate-wiggle) motion-reduce:animate-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              <span
                aria-hidden
                className={`flex shrink-0 items-center gap-1 text-sm font-medium opacity-0 translate-x-1 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-opacity ${
                  primary ? "text-white" : "text-bdl-red dark:text-(--sidebar-active-bar)"
                }`}
              >
                {exploreLabel}
                <ArrowRight className="size-4 -translate-x-1 transition-transform duration-200 ease-out delay-75 group-hover:translate-x-0 motion-reduce:translate-x-0" />
              </span>
            </div>
            <CardDescription className={`mt-1 min-h-10 leading-5 ${primary ? "text-white/85" : ""}`}>{description}</CardDescription>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
