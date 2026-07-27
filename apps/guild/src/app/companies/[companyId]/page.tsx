import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness } from "lucide-react";

import { CAREER } from "@forge/consts";
import { Button } from "@forge/ui/button";

import { CompanyMark } from "~/app/_components/company-mark";
import { MemberCard } from "~/app/_components/member-card";
import { SiteHeader } from "~/app/_components/site-header";
import { createPageMetadata } from "~/app/seo";
import { api } from "~/trpc/server";

const employmentExperienceLabels: Readonly<Record<string, string>> =
  CAREER.EMPLOYMENT_EXPERIENCE_LABELS;

interface CompanyPageProps {
  params: Promise<{ companyId: string }>;
}

async function getCompany(companyId: string) {
  try {
    return await api.guild.getPublicCompany({ companyId });
  } catch {
    notFound();
  }
}

export async function generateMetadata({
  params,
}: CompanyPageProps): Promise<Metadata> {
  const { companyId } = await params;
  const data = await getCompany(companyId);
  return createPageMetadata({
    title: data.company.displayName,
    description: `See the Knight Hacks members and alumni who have worked at ${data.company.displayName}.`,
    path: `/companies/${data.company.id}`,
  });
}

function formatMonth(month: string | null) {
  if (!month) return null;
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

export default async function GuildCompanyPage({ params }: CompanyPageProps) {
  const { companyId } = await params;
  const { company, relationships } = await getCompany(companyId);
  const groups = [
    {
      description: "Members working here now",
      items: relationships.filter((item) => item.state === "current"),
      label: "Current",
    },
    {
      description: "Alumni of the company",
      items: relationships.filter((item) => item.state === "past"),
      label: "Former",
    },
    {
      description: `Guild members connected to ${company.displayName}`,
      items: relationships.filter((item) => item.state === "unknown"),
      label: "Members",
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="guild-shell">
      <SiteHeader />
      <main className="container pb-16 pt-6 sm:pt-8">
        <Button asChild variant="ghost" className="-ml-3 gap-2">
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All companies
          </Link>
        </Button>

        <header className="guild-company-hero mt-5 rounded-xl border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CompanyMark
                displayName={company.displayName}
                imageUrl={company.logoUrl}
                large
              />
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                {company.displayName}
              </h1>
              {company.legalName &&
              company.legalName !== company.displayName ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {company.legalName}
                </p>
              ) : null}
            </div>
            {company.domain ? (
              <Button asChild variant="outline" className="gap-2">
                <a
                  href={`https://${company.domain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {company.domain}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        </header>

        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`${group.label}-title`}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2
                    id={`${group.label}-title`}
                    className="text-2xl font-semibold"
                  >
                    {group.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {group.items.length}
                </span>
              </div>
              <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((relationship, index) => {
                  const profile = relationship.profile;
                  const dates =
                    relationship.state === "current"
                      ? [formatMonth(relationship.startMonth), "Present"]
                          .filter(Boolean)
                          .join(" – ")
                      : [
                          formatMonth(relationship.startMonth),
                          formatMonth(relationship.endMonth),
                        ]
                          .filter(Boolean)
                          .join(" – ");
                  const employmentDetails = [
                    relationship.title,
                    relationship.experienceType
                      ? employmentExperienceLabels[relationship.experienceType]
                      : null,
                    relationship.city?.label,
                    dates,
                  ].filter((value): value is string => Boolean(value));
                  return (
                    <div key={relationship.employmentId} className="min-w-0">
                      <MemberCard
                        index={index}
                        profile={profile}
                        returnTo={`/companies/${company.id}`}
                      />
                      {employmentDetails.length > 0 ? (
                        <p
                          className="mt-2 flex h-5 min-w-0 items-center gap-2 px-1 text-xs text-muted-foreground"
                          title={employmentDetails.join(" · ")}
                        >
                          <BriefcaseBusiness
                            className="h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {employmentDetails.join(" · ")}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
