declare module "mina-scheduler" {
  import type { FC, ReactNode } from "react";
  import type { z } from "zod";

  export const SchedulerProvider: FC<{
    children?: ReactNode;
    onAddEvent?: (event: unknown) => void;
    onUpdateEvent?: (event: unknown) => void;
    onDeleteEvent?: (id: string) => void;
    initialState?: unknown[];
    weekStartsOn?: "sunday" | "monday";
  }>;

  export const SchedularView: FC<{
    views?: { views: string[]; mobileViews: string[] };
    CustomComponents?: Record<string, unknown>;
    classNames?: Record<string, unknown>;
  }>;

  export const eventSchema: z.ZodTypeAny;

  export const variants: readonly [
    "success",
    "primary",
    "default",
    "warning",
    "danger",
  ];

  export function useScheduler(): unknown;
}
