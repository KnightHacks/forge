"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@forge/ui";

/**
 * The card and metric shells the admin detail panels are built from.
 *
 * Shared so the hacker panel and the member panel are the same surface rather
 * than two approximations of one. They had drifted into a bordered card grid on
 * one screen and a flat definition list on the other, which read as two
 * different products.
 */
export function DetailSection({
  children,
  className,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  /** For a card that spans the grid, like a full-width actions panel. */
  className?: string;
  description?: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-white/10 bg-background/45",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 border-b border-border/70 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-background/60 px-3 py-2.5">
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** One label/value line inside a section, matching the member panel's rows. */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 px-3 py-2.5 last:border-b-0 sm:px-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">
        {value}
      </span>
    </div>
  );
}
