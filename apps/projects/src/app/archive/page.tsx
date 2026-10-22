import type { Metadata } from "next";

import { allAreas, projectFixtures } from "~/content/projects";
import { ArchiveBrowser } from "../_components/archive-browser";
import { SiteFooter } from "../_components/site-footer";
import { SiteHeader } from "../_components/site-header";

export const metadata: Metadata = {
  title: "Project archive",
  description:
    "Explore illustrative Knight Hacks Projects case studies by project area.",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;

  return (
    <div className="site-shell">
      <SiteHeader active="archive" />
      <main id="main-content">
        <section className="page-intro">
          <div className="container">
            <p className="eyebrow">The project archive</p>
            <h1 className="display-serif page-title">Browse the builds.</h1>
            <p className="page-lede">
              Search fictional case-study fixtures by the problem they explore,
              the tools they use, or the part of the system you want to learn
              from.
            </p>
          </div>
        </section>
        <section className="archive-section container" aria-label="Projects">
          <ArchiveBrowser
            initialArea={area}
            projects={projectFixtures}
            areas={allAreas}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
