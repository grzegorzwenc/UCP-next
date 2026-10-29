import { Badge } from "@/components/shadcn/badge";

/**
 * A file's extension as BDL's neutral badge — square corners, a grey border and a tinted
 * background, from `app/bdl/badges.css`. Same construction as `Pill`: a shadcn `Badge
 * variant="outline"` carrying a `bdl-badge-*` class, so the two read as one family.
 *
 * It earns a badge rather than a word in the meta line because a card's name truncates: the type
 * is the one thing that must survive a long file name.
 */
export function FileTypeBadge({ name, className = "" }: { name: string; className?: string }) {
  const i = name.lastIndexOf(".");
  const ext = i > 0 ? name.slice(i + 1).toUpperCase() : "FILE";
  return (
    <Badge variant="outline" className={`bdl-badge-neutral shrink-0 font-normal tabular-nums ${className}`} title={`${ext} file`}>
      {ext}
    </Badge>
  );
}
