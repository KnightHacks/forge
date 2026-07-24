"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Search } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Input } from "@forge/ui/input";

import { CompanyAdminMark } from "./company-admin-mark";

type Company = RouterOutputs["career"]["listAdminCompanies"][number];
type ReviewFilter = "all" | "approved" | "pending" | "rejected";

const reviewFilters: { label: string; value: ReviewFilter }[] = [
  { label: "All", value: "all" },
  { label: "Needs review", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function reviewBadgeClass(state: string) {
  switch (state) {
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "merged":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-destructive/30 bg-destructive/10 text-destructive-foreground";
  }
}

function ReviewBadge({ state }: { state: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("w-fit capitalize", reviewBadgeClass(state))}
    >
      {state}
    </Badge>
  );
}

export function CompanyAdminDashboard({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (reviewFilter !== "all" && company.reviewState !== reviewFilter) {
        return false;
      }
      if (!normalized) return true;
      return [
        company.displayName,
        company.legalName,
        company.domain,
        ...company.aliases,
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [companies, query, reviewFilter]);
  const pendingCount = companies.filter(
    (company) => company.reviewState === "pending",
  ).length;
  const relationshipCount = companies.reduce(
    (count, company) =>
      count +
      company.currentMembers +
      company.formerMembers +
      company.unconfirmedMembers,
    0,
  );

  return (
    <main className="container min-w-0 px-3 pb-12 pt-4 sm:px-8 sm:pb-16 sm:pt-6 md:pt-10">
      <div className="min-w-0 space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Company intelligence
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl">
              Companies
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review company records and see where Knight Hacks members have
              worked.
            </p>
          </div>

          <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-card/90">
            <Metric label="Companies" value={companies.length} />
            <Metric label="Needs review" value={pendingCount} />
            <Metric label="Career records" value={relationshipCount} />
          </dl>
        </header>

        <Card className="gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
          <CardHeader className="gap-3 border-b border-border/70 px-4 py-4 md:px-6">
            <div className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search companies"
                className="h-11 bg-background/70 pl-9"
                placeholder="Search company, domain, or alias"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div
              className="flex flex-wrap gap-2"
              aria-label="Filter companies by review status"
            >
              {reviewFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={
                    reviewFilter === filter.value ? "secondary" : "ghost"
                  }
                  className="h-9 rounded-md px-3"
                  aria-pressed={reviewFilter === filter.value}
                  onClick={() => setReviewFilter(filter.value)}
                >
                  {filter.label}
                  {filter.value === "pending" && pendingCount > 0 ? (
                    <span className="ml-1.5 text-amber-300">
                      {pendingCount}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length > 0 ? (
              <div className="divide-y divide-border/70">
                {filtered.map((company) => {
                  const total =
                    company.currentMembers +
                    company.formerMembers +
                    company.unconfirmedMembers;
                  return (
                    <Link
                      key={company.id}
                      href={`/admin/companies/${company.id}`}
                      className="group grid min-h-24 gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-6"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <CompanyAdminMark
                          displayName={company.displayName}
                          imageUrl={company.logoUrl}
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">
                              {company.displayName}
                            </span>
                            <ReviewBadge state={company.reviewState} />
                          </span>
                          <span className="mt-1 block truncate text-sm text-muted-foreground">
                            {company.domain ??
                              company.legalName ??
                              "No company details yet"}
                          </span>
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>
                          <strong className="font-semibold text-foreground">
                            {company.currentMembers}
                          </strong>{" "}
                          current
                        </span>
                        <span>
                          <strong className="font-semibold text-foreground">
                            {company.formerMembers}
                          </strong>{" "}
                          former
                        </span>
                        {company.unconfirmedMembers > 0 ? (
                          <span>
                            <strong className="font-semibold text-amber-300">
                              {company.unconfirmedMembers}
                            </strong>{" "}
                            unconfirmed
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          {total} total
                          <ArrowUpRight
                            className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <CheckCircle2
                  className="h-9 w-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-semibold">No companies found</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a broader search or another review status.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 border-l border-border/70 px-4 py-3 first:border-l-0 sm:min-w-32">
      <dd className="text-xl font-semibold">{value}</dd>
      <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
