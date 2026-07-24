import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
} from "lucide-react";

import { CAREER } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

import {
  CollectionMotion,
  CollectionMotionItem,
} from "~/app/_components/collection-motion";
import { CompanyMark } from "~/app/_components/company-mark";
import { SiteHeader } from "~/app/_components/site-header";
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
  return {
    title: data.company.displayName,
    description: `Knight Hacks members and alumni connected to ${data.company.displayName}.`,
  };
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
                domain={company.domain}
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
              <CollectionMotion className="grid gap-3 md:grid-cols-2">
                {group.items.map((relationship) => {
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
                  return (
                    <CollectionMotionItem key={relationship.employmentId}>
                      <Link
                        href={`/members/${profile.id}?from=/companies/${company.id}`}
                        className="guild-person-row group flex min-h-32 gap-4 rounded-xl border border-white/10 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {profile.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.profilePictureUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-semibold text-primary">
                            {profile.firstName.at(0)}
                            {profile.lastName.at(0)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-lg font-semibold group-hover:text-primary">
                            {profile.firstName} {profile.lastName}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {relationship.title ?? "Guild member"}
                          </span>
                          <span className="mt-3 flex flex-wrap gap-2">
                            {relationship.experienceType ? (
                              <Badge
                                variant="outline"
                                className="gap-1.5 border-white/10 bg-background/50"
                              >
                                <BriefcaseBusiness
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {
                                  employmentExperienceLabels[
                                    relationship.experienceType
                                  ]
                                }
                              </Badge>
                            ) : null}
                            {relationship.city ? (
                              <Badge
                                variant="outline"
                                className="gap-1.5 border-white/10 bg-background/50"
                              >
                                <MapPin
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {relationship.city.label}
                              </Badge>
                            ) : null}
                            {dates ? (
                              <span className="self-center text-xs text-muted-foreground">
                                {dates}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </Link>
                    </CollectionMotionItem>
                  );
                })}
              </CollectionMotion>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
