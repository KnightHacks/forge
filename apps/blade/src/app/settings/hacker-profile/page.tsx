import { redirect } from "next/navigation";

import { PortalUnavailable } from "~/app/_components/hackathon/portal-unavailable";
import { buildParticipantPortalUrl } from "~/lib/hackathon-portal";
import { api } from "~/trpc/server";

export default async function LegacyHackerProfilePage() {
  const hackathon = await api.hackathon.getCurrentHackathon();
  const portalUrl = buildParticipantPortalUrl(
    hackathon?.portalBaseUrl,
    "/dashboard/profile",
  );

  if (portalUrl) redirect(portalUrl);
  return <PortalUnavailable displayName={hackathon?.displayName} />;
}
