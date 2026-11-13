/**
 * The builder's preview breakpoints — the one source of truth for their widths.
 *
 * These widths used to be stated twice: once here (for the canvas frame and its scale) and
 * again in `app/globals.css` as `.site`, `.site.tablet`, `.site.mobile`. The two drifted, so
 * the tablet rendition drew a 768px page inside a 700px frame and XL had no rule at all and
 * silently fell back to the desktop width. `SiteChrome` now takes its width from this map, so
 * changing a breakpoint here changes the page, the frame and the scale together.
 *
 * Values match the UCP mock's `deviceWidth`.
 */
export type Device = "xl" | "desktop" | "tablet" | "mobile";

export const DEVICE_W: Record<Device, number> = { xl: 1536, desktop: 1280, tablet: 700, mobile: 390 };

/** Order, label and icon path for the toolbar's width switch — widest first. */
export const DEVICES: [Device, string, string][] = [
  ["xl", "Extra large", "M2.5 4.5h19v12h-19zM8 20h8M12 16.5v3.5"],
  ["desktop", "Desktop", "M3 4.5h18v11.5H3zM8.5 20h7M12 16v4"],
  ["tablet", "Tablet", "M5.5 3h13v18h-13zM11 18h2"],
  ["mobile", "Mobile", "M8 2.5h8v19H8zM11 18.5h2"],
];

/** The width a preview thumbnail is rendered at before being scaled down. */
export const THUMB_W = DEVICE_W.desktop;
