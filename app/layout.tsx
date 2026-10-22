import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* Univers Next for HSBC through next/font/local rather than the plain @font-face BDL ships.
   Two reasons, both about the load: next/font emits a <link rel="preload"> for the woff, and
   `adjustFontFallback` writes a metric-matched Arial fallback (size-adjust / ascent-override)
   so the swap does not reflow every line. With the raw @font-face the page painted in Arial
   and visibly jittered when the real face arrived. */
const univers = localFont({
  src: [
    { path: "../public/fonts/UniversNextforHSBCW01-Lt.woff", weight: "300", style: "normal" },
    { path: "../public/fonts/UniversNextforHSBCW01-Rg.woff", weight: "400", style: "normal" },
    { path: "../public/fonts/UniversNextforHSBCW01-Md.woff", weight: "500", style: "normal" },
    { path: "../public/fonts/UniversNextforHSBCW01-Bd.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-univers",
  display: "swap",
  adjustFontFallback: "Arial",
});
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "HSBC Unified Content Platform",
  description: "UCP authoring on the ContentLIBRE Management API",
};

/* Apply the saved theme before first paint so dark mode never flashes light. Blocking on
   purpose: it is a two-line class toggle. The switcher lives in the sidebar's user menu and
   writes the same localStorage key. */
const THEME_SCRIPT = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${univers.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
