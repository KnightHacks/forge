import type { Metadata } from "next";

import type { IssueSearchParams } from "~/app/_components/admin/issues/params";
import { renderIssueWorkspace } from "~/app/_components/admin/issues/server";

export const metadata: Metadata = { title: "Blade | Issues List" };

export default function IssuesListPage({
  searchParams,
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  return renderIssueWorkspace("list", searchParams);
}
