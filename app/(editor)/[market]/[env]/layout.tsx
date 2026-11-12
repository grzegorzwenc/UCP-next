import { Palette } from "@/components/shell/Palette";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { TooltipProvider } from "@/components/shadcn/tooltip";

/**
 * Editor shell — full screen, no app chrome.
 *
 * The page builder used to render inside the `(cms)` layout, so it carried the app sidebar,
 * the app top bar and the environment switcher on top of its own toolbar, stepper and hint
 * bar. Focus mode papered over that with `body.focus .cms-shell { display: none }` CSS,
 * which only hid the chrome once the author asked for it.
 *
 * A route group fixes it at the root instead: `(editor)` resolves to the same URLs as
 * `(cms)` (parentheses are organisational and never appear in the path), but the builder is
 * no longer a child of the CMS shell, so the sidebar and top bar are simply not rendered.
 *
 * What the builder still needs from a shell, it gets here:
 * - `ConfirmProvider` — `useConfirm()` for the destructive-action prompts
 * - `TooltipProvider` — the toolbar's tooltips
 * - `Palette`         — ⌘K, which talks to the builder over `window` events. It is an
 *                       overlay, not chrome, so it stays: dropping it would silently kill
 *                       the command palette inside the editor.
 *
 * This layout deliberately touches **no runtime data**. `loading.tsx` sits below the layout
 * in the hierarchy, so it cannot cover uncached or runtime access up here: a `cookies()` read
 * in this file blocks the navigation until the layout has rendered and the "Loading editor"
 * fallback never appears. `me()` reads the session cookie, so it lives in `page.tsx` — which
 * `loading.tsx` *can* cover — and `SessionProvider` is mounted there with it.
 * See next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md, "Interaction with
 * loading.js". Keep any new data fetching out of this file, or wrap it in its own `<Suspense>`.
 *
 * This is a nested layout under `app/layout.tsx`, not a second root layout, so moving
 * between the library and the editor is still a client transition rather than a full reload.
 */
export default async function EditorLayout({ children, params }: LayoutProps<"/[market]/[env]">) {
  const { market: mid, env } = await params; // route params only — not runtime data, so the fallback still shows
  return (
    <ConfirmProvider>
      <TooltipProvider>
        <div className="editor-shell h-dvh min-w-0 overflow-hidden">
          <Palette marketId={mid} envId={env} />
          {children}
        </div>
      </TooltipProvider>
    </ConfirmProvider>
  );
}
