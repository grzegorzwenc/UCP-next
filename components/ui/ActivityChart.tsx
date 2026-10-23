"use client";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/shadcn/chart";

export type ActivityPoint = { day: string; published: number; created: number; updated: number };

/**
 * Content activity over the last 30 days, on shadcn's Recharts-based chart.
 *
 * Colour: the three series use --chart-1/2/3. BDL's own light values did not pass the
 * categorical palette checks — #376798 sits under the chroma floor and reads grey next to the
 * others — so app/globals.css re-points chart-2 and chart-3 at BDL cyan and amber-dark, which
 * clear all six checks (worst adjacent pair ΔE 26 normal / 20 deutan, all ≥ 3:1 on surface).
 *
 * Curves are `monotone`, which smooths without the overshoot a natural spline would add to a
 * count that cannot go below zero.
 *
 * Recharts animates on mount but ignores prefers-reduced-motion, so that is handled here.
 */
const config = {
  published: { label: "Pages published", color: "var(--chart-1)" },
  created: { label: "Pages created", color: "var(--chart-2)" },
  updated: { label: "Content updated", color: "var(--chart-3)" },
} satisfies ChartConfig;

const SERIES = ["published", "created", "updated"] as const;

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setAnimate(!mq.matches);
    const frame = requestAnimationFrame(read);
    mq.addEventListener("change", read);
    return () => { cancelAnimationFrame(frame); mq.removeEventListener("change", read); };
  }, []);

  return (
    <ChartContainer config={config} className="h-full min-h-64 w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          {SERIES.map((k) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${k})`} stopOpacity={0.22} />
              <stop offset="100%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} />
        <YAxis width={28} tickLine={false} axisLine={false} tickMargin={6} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {SERIES.map((k, i) => (
          <Area
            key={k}
            dataKey={k}
            type="monotone"
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            fill={`url(#fill-${k})`}
            isAnimationActive={animate}
            animationDuration={700}
            animationBegin={i * 90}
            animationEasing="ease-out"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
