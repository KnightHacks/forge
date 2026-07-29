import type { Metadata } from "next";

import type { SearchParams } from "~/lib/search-params";
import { renderIssueWorkspace } from "~/app/_components/admin/issues/server";

export const metadata: Metadata = { title: "Blade | Issues Archive" };

export default function IssuesArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return renderIssueWorkspace("archive", searchParams);
}
