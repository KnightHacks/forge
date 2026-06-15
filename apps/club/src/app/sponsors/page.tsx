import type { Metadata } from "next";

import { env } from "~/env";
import { createPageMetadata } from "../seo";
import SponsorsClient from "./sponsors-client";

export const metadata: Metadata = createPageMetadata({
  title: "Sponsors",
  description:
    "Meet the sponsors and partners supporting Knight Hacks students, hackathons, workshops, and builder communities at UCF.",
  path: "/sponsors",
});

export default function SponsorsPage() {
  return <SponsorsClient bladeUrl={env.BLADE_URL} />;
}
