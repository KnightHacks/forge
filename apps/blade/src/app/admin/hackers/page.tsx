import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackerRoster } from "~/app/_components/admin/hackathon/hackers/hacker-roster";
import { canAccessHackerAdmin, canEditHackerAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackers",
};

/**
 * Hacker management as its own plane, with the hackathon chosen from a picker
 * rather than baked into the route.
 *
 * The roster is per-hackathon, but an officer thinks in terms of "the hackers
 * screen", not "this hackathon's hackers screen" — and switching hackathons to
 * compare last year's numbers should not mean navigating back out to a list.
 * Which hackathon is selected lives in the query string with the filters, so
 * the whole view is one shareable address.
 */
export default async function AdminHackersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessHackerAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const { hackathons } = await api.hacker.listHackathonOptions();
  const params = await searchParams;
  const requested =
    typeof params.hackathon === "string" ? params.hackathon : undefined;

  // Ordered by proximity to now, so the default is the hackathon about to
  // happen or the one that just did — what an officer wants most of the time.
  const matched = hackathons.find((hackathon) => hackathon.id === requested);

  // A named-but-unknown hackathon is a 404, not a silent fallback. Falling back
  // meant someone opening a shared link to a deleted hackathon read the
  // *current* one's roster while the URL still named the other, and every
  // filter they set afterwards preserved the bogus id.
  if (requested !== undefined && !matched) notFound();

  const selected = matched ?? hackathons[0];

  return (
    <HackerRoster
      canEdit={canEditHackerAdmin(permissions)}
      isOfficer={permissions.IS_OFFICER === true}
      key={selected?.id ?? "no-hackathon"}
      hackathons={hackathons}
      selected={selected ?? null}
    />
  );
}
