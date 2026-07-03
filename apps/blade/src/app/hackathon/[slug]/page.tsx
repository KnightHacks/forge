import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PortalUnavailable } from "~/app/_components/hackathon/portal-unavailable";
import { buildParticipantPortalUrl } from "~/lib/hackathon-portal";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Hackathon Portal",
};

export default async function LegacyHackathonDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hackathon = await api.hackathon.getHackathon({ hackathonName: slug });
  const portalUrl = buildParticipantPortalUrl(
    hackathon?.portalBaseUrl,
    "/dashboard",
  );

  if (portalUrl) redirect(portalUrl);
  return <PortalUnavailable displayName={hackathon?.displayName} />;
}
