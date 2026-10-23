"use client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

/**
 * The quiet section heading used between blocks on a screen: small, muted, with an optional ⓘ
 * that explains what the block is for. Ported from hsbc-ucpmock's home, where it keeps the page
 * calm by letting the heading recede and the content carry the weight.
 */
export function SectionTitle({ id, children, help }: { id?: string; children: React.ReactNode; help?: string }) {
  return (
    <div className="mb-3 flex items-center gap-1.5">
      <h2 id={id} className="text-sm font-medium text-muted-foreground">{children}</h2>
      {help && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" aria-label={`About ${String(children).toLowerCase()}`}
                className="inline-flex cursor-help items-center text-muted-foreground outline-none transition-colors duration-160 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <Info className="size-4" />
              </button>
            }
          />
          <TooltipContent side="right" className="max-w-xs">{help}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
