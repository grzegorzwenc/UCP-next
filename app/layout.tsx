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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
