import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PortalUnavailable } from "~/app/_components/hackathon/portal-unavailable";
import { buildParticipantPortalUrl } from "~/lib/hackathon-portal";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Hackathon Application",
};

export default async function LegacyHackerApplicationPage({
  params,
}: {
  params: Promise<{ "hackathon-id": string }>;
}) {
  const { "hackathon-id": hackathonName } = await params;
  const hackathon = await api.hackathon.getHackathon({ hackathonName });
  const portalUrl = buildParticipantPortalUrl(
    hackathon?.portalBaseUrl,
    "/apply",
  );

  if (portalUrl) redirect(portalUrl);
  return <PortalUnavailable displayName={hackathon?.displayName} />;
}
