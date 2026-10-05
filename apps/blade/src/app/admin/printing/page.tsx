import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Printer } from "lucide-react";

import { PRINTING } from "@forge/consts";
import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { PrintingQueueWorkspace } from "~/app/_components/admin/printing/printing-queue-workspace";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { canAccessPrintingQueue } from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Work the on-site 3D printer queue.",
  title: "Blade | Printing Queue",
};

/** No `status` opens the Active view; `status=all` shows the full history. */
function parseView(value: string | undefined) {
  if (value === "all") return "all" as const;
  return (
    PRINTING.PRINT_JOB_STATUSES.find((status) => status === value) ??
    ("active" as const)
  );
}

/**
 * The selected hackathon and status filter live in the query string, so a
 * refresh or a shared link opens the same view.
 */
export default async function AdminPrintingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessPrintingQueue(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const [params, hackathons] = await Promise.all([
    searchParams,
    api.printing.listHackathons(),
  ]);
  const requested = first(params.hackathon);
  const matched = hackathons.find((hackathon) => hackathon.id === requested);
  if (requested !== undefined && !matched) notFound();
  const selected = matched ?? hackathons[0];

  if (!selected) {
    return (
      <main className={adminPageLayoutClassName}>
        <AdminPageHeader
          description="Hackers' 3D print jobs appear here once a hackathon exists."
          eyebrow="Hackathon"
          icon={Printer}
          title="Printing Queue"
        />
        <section className="rounded-lg border border-dashed border-white/15 bg-card/75 px-5 py-16 text-center">
          <h2 className="text-xl font-semibold">No hackathons yet</h2>
        </section>
      </main>
    );
  }

  const view = parseView(first(params.status));
  const [queue, configuration] = await Promise.all([
    api.printing.list({
      hackathonId: selected.id,
      status: view === "all" ? undefined : view,
    }),
    api.printing.getConfiguration({ hackathonId: selected.id }),
  ]);

  return (
    <PrintingQueueWorkspace
      configuration={configuration}
      hackathons={hackathons}
      key={selected.id}
      queue={queue}
      selected={selected}
      view={view}
    />
  );
}
