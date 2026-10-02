import { PRINTING } from "@forge/consts";
import { cn } from "@forge/ui";

import { PRINT_STATUS_PILL_CLASS } from "./print-queue-format";

export function PrintStatusPill({
  status,
}: {
  status: PRINTING.PrintJobStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium",
        PRINT_STATUS_PILL_CLASS[status],
      )}
    >
      {PRINTING.PRINT_JOB_STATUS_LABELS[status]}
    </span>
  );
}
