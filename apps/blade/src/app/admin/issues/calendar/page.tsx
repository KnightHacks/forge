import type { Metadata } from "next";

import type { IssueSearchParams } from "~/app/_components/admin/issues/params";
import { renderIssueWorkspace } from "~/app/_components/admin/issues/server";

export const metadata: Metadata = {
  description: "Coordinate cross-team Club work on a shared due-date calendar.",
  title: "Blade | Issues Calendar",
};

export default function IssuesCalendarPage({
  searchParams,
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  return renderIssueWorkspace("calendar", searchParams);
}
