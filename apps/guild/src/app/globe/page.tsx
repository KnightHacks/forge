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
      <main className="container flex min-h-[calc(100svh-4rem)] flex-col py-6 sm:py-7 md:h-[calc(100svh-4rem)] md:min-h-[40rem] md:overflow-hidden">
        <PageIntroMotion className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Across the map</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              The Guild, right now
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              See where Knight Hacks members are building, learning, and
              working.
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {peopleCount} {peopleCount === 1 ? "member" : "members"} across{" "}
            {clusters.length} {clusters.length === 1 ? "city" : "cities"}
          </p>
        </PageIntroMotion>
        <PageSurfaceMotion className="min-h-0 flex-1">
          <GuildGlobe clusters={clusters} />
        </PageSurfaceMotion>
      </main>
    </div>
  );
}
