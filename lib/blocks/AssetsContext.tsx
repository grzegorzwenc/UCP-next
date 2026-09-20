"use client";
import { createContext, useContext } from "react";

/** Asset id → stored picture (data URL) so the canvas can show real uploaded photos. Empty outside the builder. */
export const AssetsContext = createContext<Record<string, { data?: string }>>({});

/** Mast surface: real photo as background when the `image` prop points at an asset we hold data for, HSBC grey gradient otherwise. */
export function MastSurface({ image, children }: { image?: string; children: React.ReactNode }) {
  const assets = useContext(AssetsContext); const data = image ? assets[image]?.data : undefined;
  return <div className="s-mast" style={data ? { backgroundImage: `url(${data})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{children}</div>;
}
