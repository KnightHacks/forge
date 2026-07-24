import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { GuildGlobe } from "~/app/_components/guild-globe";
import {
  PageIntroMotion,
  PageSurfaceMotion,
} from "~/app/_components/page-motion";
import { SiteHeader } from "~/app/_components/site-header";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Guild Globe",
  description: "See where Knight Hacks members are across the United States.",
};

export default async function GuildGlobePage() {
  const clusters = await api.guild.getPublicGlobeLocations();
  const peopleCount = clusters.reduce(
    (count, cluster) => count + cluster.count,
    0,
  );

  return (
    <div className="guild-shell">
      <SiteHeader />
      <main className="container pb-16 pt-10 sm:pt-14">
        <PageIntroMotion className="mb-8 max-w-3xl">
          <p className="text-sm font-medium text-primary">Across the map</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            The Guild, right now
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            See where Knight Hacks members are building, learning, and working.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {peopleCount} {peopleCount === 1 ? "member" : "members"} across{" "}
            {clusters.length} {clusters.length === 1 ? "city" : "cities"}
          </p>
        </PageIntroMotion>
        <PageSurfaceMotion>
          <GuildGlobe clusters={clusters} />
        </PageSurfaceMotion>
      </main>
    </div>
  );
}
