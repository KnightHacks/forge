import type { ReactNode } from "react";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

export function AnalyticsMetricCard({
  definition,
  detail,
  label,
  value,
}: {
  definition: string;
  detail: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex h-40 min-w-0 flex-col rounded-lg border border-white/10 bg-card/95 p-4 shadow-lg shadow-black/15"
      data-analytics-metric-card="true"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Define ${label}`}
                className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <Info className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72 text-xs leading-5">
              {definition}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <div
        className="mt-auto min-h-5 pt-3 text-xs leading-5 text-muted-foreground"
        data-analytics-metric-detail="true"
      >
        {detail}
      </div>
    </div>
  );
}

export function AnalyticsMetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}
