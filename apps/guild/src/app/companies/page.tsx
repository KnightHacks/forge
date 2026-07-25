import type { Metadata } from "next";

import { CompanyDirectory } from "~/app/_components/company-directory";
import { PageIntroMotion } from "~/app/_components/page-motion";
import { SiteHeader } from "~/app/_components/site-header";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Explore where Knight Hacks members and alumni have worked across the Guild.",
};

export default async function GuildCompaniesPage() {
  const companies = await api.guild.listPublicCompanies();

  return (
    <div className="guild-shell">
      <SiteHeader />
      <main>
        <section>
          <div className="container pb-0 pt-10 sm:pt-14">
            <PageIntroMotion className="max-w-3xl">
              <p className="text-sm font-medium text-primary">Career network</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                Where the Guild works
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Follow the paths Knight Hacks members take from campus into
                teams across the industry.
              </p>
            </PageIntroMotion>
          </div>
        </section>
        <section className="container pb-16 pt-6">
          <CompanyDirectory companies={companies} />
        </section>
      </main>
    </div>
  );
}
