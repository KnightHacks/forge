import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@forge/ui";
import { Skeleton } from "@forge/ui/skeleton";

import { AdminPageInfoTooltip } from "./admin-page-info-tooltip";

export const adminPageClassName =
  "container min-w-0 px-3 pb-12 pt-4 sm:px-8 sm:pb-16 sm:pt-6 md:pt-10";

export const adminPageStackClassName = "min-w-0 space-y-4 sm:space-y-6";

export const adminPageLayoutClassName = `${adminPageClassName} ${adminPageStackClassName}`;

export function AdminPageHeader({
  actions,
  className,
  description,
  title,
  titleClassName,
}: {
  actions?: ReactNode;
  className?: string;
  description: ReactNode;
  eyebrow: ReactNode;
  icon: LucideIcon;
  title: ReactNode;
  titleClassName?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl",
            titleClassName,
          )}
        >
          {title}
        </h1>
        <AdminPageInfoTooltip description={description} />
      </div>
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function AdminPageHeaderSkeleton({
  actions = 0,
  titleWidth = "w-72",
}: {
  actions?: number;
  descriptionWidth?: string;
  titleWidth?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Skeleton className={cn("h-10 max-w-full sm:h-12", titleWidth)} />
      </div>
      {actions > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton className="h-11 w-32" key={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
