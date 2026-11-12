import { EditorSkeleton } from "@/components/builder/EditorSkeleton";

/**
 * Shown while the route loads the page document, the user list, the content models and the
 * resolved entity bindings. Was `SectionSkeleton section="the page builder"` — a table.
 */
export default function Loading() {
  return <EditorSkeleton />;
}
