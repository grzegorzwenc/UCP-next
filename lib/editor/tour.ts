/**
 * "How the editor works" — a guided walkthrough of the page builder.
 *
 * Ported from the UCP mock's editor tour. Every stop points at this editor's own equivalent of
 * the stop the mock highlights; where this editor has no equivalent the stop is dropped rather
 * than invented, and where it has something the mock does not (the right panel's icon tabs) the
 * matching stop says so instead of gaining a step of its own.
 *
 * driver.js and its CSS are imported inside `start()`, so none of it is in the bundle until
 * somebody actually asks for the tour.
 */
const KEY = "ucp:editor-tour-done";

export function tourSeen(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
}
function markSeen() {
  try { localStorage.setItem(KEY, "1"); } catch { /* private window: just replay next time */ }
}

/** What the tour needs the editor to do so that every stop it points at actually exists. */
export type TourHost = {
  showPanels: () => void;
  openLeft: (tab: "components" | "outline" | "patterns") => void;
  openRight: () => void;
  setDevice: (d: "desktop") => void;
  selectFirstBlock: () => string | null;
};

export async function startEditorTour(host: TourHost) {
  const [{ driver }] = await Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
    import("@/app/tour.css"),
  ]);

  /* Put the editor into the state the tour describes: panels docked and open, desktop width,
     and a block selected so the settings panel is showing real fields rather than an empty state. */
  host.showPanels();
  host.setDevice("desktop");
  host.openLeft("components");
  const blockId = host.selectFirstBlock();
  if (!blockId) host.openRight();

  const d = driver({
    popoverClass: "bdl-tour-popover",
    showProgress: false,
    stagePadding: 6,
    overlayColor: "#000",
    overlayOpacity: 0.8,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    onDestroyed: () => { host.openLeft("components"); markSeen(); },
    steps: [
      { popover: { title: "How the editor works", description: "A quick tour of the page builder: where the components live, where you change them, and how a page gets saved and sent on. You can replay it any time from the bottom of the components panel." } },
      { element: ".bld-frame", popover: { title: "The page", description: "The page exactly as visitors will see it, at its real width. Click any text to edit it in place; click a component to select it." } },
      { element: 'aside[data-side="left"]', onHighlightStarted: () => host.openLeft("components"), popover: { title: "Components", description: "Everything you can add, grouped and searchable. Click one to drop it in below whatever is selected.", side: "right" } },
      { element: 'aside[data-side="left"]', onHighlightStarted: () => host.openLeft("patterns"), popover: { title: "Design patterns", description: "Groups of components saved together — built-in ones from the design system, plus any your team has saved. Hover one to preview it before adding.", side: "right" } },
      { element: 'aside[data-side="left"]', onHighlightStarted: () => host.openLeft("outline"), popover: { title: "Outline", description: "Everything already on the page, in order. Click a row to jump to it on the canvas.", side: "right" } },
      ...(blockId ? [{ element: `.cblk[data-id="${blockId}"]`, onHighlightStarted: () => host.openLeft("components"), popover: { title: "The selected component", description: "A selected component gets a toolbar: edit its text, ask AI to rewrite it, move it, or save it into a pattern.", side: "bottom" as const } }] : []),
      { element: 'aside[data-side="right"]', popover: { title: "Settings", description: "The settings for whatever is selected, grouped into sections you can fold away. The icons along the top switch between page settings, linked content, AI, insights, comments and version history.", side: "left" } },
      { element: '[aria-label="Preview width"]', popover: { title: "Breakpoints", description: "Check the page at each width. The page re-flows for real — this is the layout visitors get, not a picture of it.", side: "bottom" } },
      { element: "[data-tour-focus]", popover: { title: "Focus mode", description: "Hides both panels so the page has the whole screen. ⌘. toggles it, and clicking anything on the page brings the panels back.", side: "bottom" } },
      { element: "[data-tour-actions]", popover: { title: "Saving and publishing", description: "Changes save by themselves a moment after you stop typing. From here you can preview the page as a visitor and send it on for review.", side: "bottom" } },
      { element: "[data-tour-close]", popover: { title: "Closing", description: "Closes the editor and goes back to Pages. Anything unsaved is written first.", side: "bottom" } },
      { element: "[data-tour-help]", onHighlightStarted: () => host.openLeft("components"), popover: { title: "Replay this tour", description: "This is where the tour lives. Click it whenever you want to run through the editor again.", side: "top" } },
      { popover: { title: "That's the editor", description: "Add components on the left, change them on the right, and check the page at each width before you send it on." } },
    ],
  });
  d.drive();
}
