import type { Metadata } from "next";

import { env } from "~/env";
import { createPageMetadata } from "../seo";
import TeamsClient from "./teams-client";

export const metadata: Metadata = createPageMetadata({
  title: "Teams",
  description:
    "Meet the Knight Hacks officers and club teams that build events, workshops, outreach, and hackathons at UCF.",
  path: "/teams",
});

export default function TeamsPage() {
  return <TeamsClient bladeUrl={env.BLADE_URL} />;
}
