"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Search, UsersRound } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Input } from "@forge/ui/input";

import { CollectionMotion, CollectionMotionItem } from "./collection-motion";
import { CompanyMark } from "./company-mark";
import { PageSurfaceMotion } from "./page-motion";

type Company = RouterOutputs["guild"]["listPublicCompanies"][number];

function relationshipLabel(company: Company) {
  const total =
    company.currentMembers + company.formerMembers + company.unconfirmedMembers;
  return `${total} Guild ${total === 1 ? "member" : "members"}`;
}

export function CompanyDirectory({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const relationshipCount = companies.reduce(
    (count, company) =>
      count +
      company.currentMembers +
      company.formerMembers +
      company.unconfirmedMembers,
    0,
  );
  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return companies;
    return companies.filter((company) =>
      [company.displayName, company.domain].some((value) =>
        value?.toLowerCase().includes(normalized),
      ),
    );
  }, [companies, query]);

  if (companies.length === 0) {
    return (
      <PageSurfaceMotion>
        <div className="guild-search-surface rounded-xl px-6 py-16 text-center">
          <Building2
            className="mx-auto h-9 w-9 text-primary"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold">No companies yet</h2>
        </div>
      </PageSurfaceMotion>
    );
  }

  return (
    <PageSurfaceMotion>
      <div className="guild-search-surface mb-6 rounded-lg p-3 md:p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search Guild companies"
            className="h-11 border-white/10 bg-background/70 pl-10"
            placeholder="Search companies"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {filteredCompanies.length > 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <p aria-live="polite">
              Showing {filteredCompanies.length}{" "}
              {filteredCompanies.length === 1 ? "company" : "companies"}
            </p>
            <p>
              {relationshipCount} Guild{" "}
              {relationshipCount === 1 ? "connection" : "connections"}
            </p>
          </div>
          <CollectionMotion
            key={query.trim().toLowerCase() || "all"}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {filteredCompanies.map((company) => (
              <CollectionMotionItem key={company.id} className="h-full">
                <Link
                  href={`/companies/${company.id}`}
                  className="guild-company-card group flex h-full min-h-40 flex-col rounded-xl border border-white/10 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-48"
                >
                  <div className="flex items-start justify-between gap-4">
                    <CompanyMark
                      displayName={company.displayName}
                      domain={company.domain}
                      imageUrl={company.logoUrl}
                    />
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-tight">
                    {company.displayName}
                  </h2>
                  <p className="mt-1 min-h-5 truncate text-sm text-muted-foreground">
                    {company.domain}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-white/10 bg-background/55"
                    >
                      <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                      {relationshipLabel(company)}
                    </Badge>
                    {company.currentMembers > 0 ? (
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                        {company.currentMembers} current
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </CollectionMotionItem>
            ))}
          </CollectionMotion>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-card/40 px-6 py-14 text-center">
          <h2 className="font-semibold">No companies found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different company name.
          </p>
        </div>
      )}
    </PageSurfaceMotion>
  );
}
