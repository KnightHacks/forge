import type { Metadata } from "next";

import type { SearchParams } from "~/lib/search-params";
import { renderIssueWorkspace } from "~/app/_components/admin/issues/server";

export const metadata: Metadata = {
  description: "See Club issue deadlines on a shared calendar.",
  title: "Blade | Issues Calendar",
};

export default function IssuesCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return renderIssueWorkspace("calendar", searchParams);
}
