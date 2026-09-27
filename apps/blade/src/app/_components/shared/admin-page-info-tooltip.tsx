"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { CircleHelp } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

export function AdminPageInfoTooltip({
  description,
}: {
  description: ReactNode;
}) {
  const descriptionId = useId();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-describedby={descriptionId}
            aria-label="About this page"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelp className="size-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </TooltipProvider>
  );
}
