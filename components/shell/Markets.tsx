"use client";
import { createContext, useContext } from "react";
import { pickMarket, type Market } from "@/lib/markets";

/** The backend's markets for client components; the CMS layout loads them once per request (lib/server/markets.ts). */
const Ctx = createContext<Market[]>([]);
export function MarketsProvider({ markets, children }: { markets: Market[]; children: React.ReactNode }) { return <Ctx.Provider value={markets}>{children}</Ctx.Provider>; }
export const useMarkets = () => useContext(Ctx);
export const useMarket = (id: string) => pickMarket(useContext(Ctx), id);
