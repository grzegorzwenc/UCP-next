import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* The UI face is Univers Next for HSBC, self-hosted from public/fonts and declared in
   app/bdl/fonts.css — no Google font for the sans stack. */
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
    <html lang="en" className={`${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
