import type { Metadata } from "next";

import { allTechnologies, projectFixtures } from "~/content/projects";
import { ArchiveBrowser } from "../_components/archive-browser";
import { SiteFooter } from "../_components/site-footer";
import { SiteHeader } from "../_components/site-header";

export const metadata: Metadata = {
  title: "Project archive",
  description:
    "Search illustrative Knight Hacks Projects case studies by topic and technology.",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ technology?: string }>;
}) {
  const { technology } = await searchParams;

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
            initialTechnology={technology}
            projects={projectFixtures}
            technologies={allTechnologies}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
