import type { HackerApplicationStatus as HackerStatus } from "@forge/hacker-sdk";
import { getHackerLifecycleState as getSdkLifecycleState } from "@forge/hacker-sdk";

export function getHackerLifecycleState({
  applicationDeadline,
  applicationOpen,
  confirmationCapacity,
  confirmationDeadline,
  confirmedCount,
  now,
  startDate,
  status,
}: {
  applicationDeadline: Date;
  applicationOpen: Date;
  confirmationCapacity: number | null;
  confirmationDeadline: Date;
  confirmedCount: number;
  now?: Date;
  startDate: Date;
  status: HackerStatus | null;
}) {
  return getSdkLifecycleState({
    applicationClosesAt: applicationDeadline,
    applicationOpensAt: applicationOpen,
    confirmationCapacity,
    confirmationClosesAt: confirmationDeadline,
    confirmedCount,
    now,
    startsAt: startDate,
    status,
  });
}
