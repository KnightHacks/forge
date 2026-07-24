"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDashed,
  Search,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Input } from "@forge/ui/input";

import { MemberAdminViewNav } from "./member-admin-view-nav";

type Company = RouterOutputs["career"]["listAdminCompanies"][number];

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
    <Badge variant="outline" className={reviewBadgeClass(state)}>
      {state}
    </Badge>
  );
}

export function CompanyAdminDashboard({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return companies;
    return companies.filter((company) =>
      [
        company.displayName,
        company.legalName,
        company.domain,
        ...company.aliases,
      ].some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [companies, query]);
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
        <header>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Member intelligence
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl">
            Companies
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            See the organizations across member career histories and clean up
            new community submissions before sponsorship season.
          </p>
        </header>

        <MemberAdminViewNav active="companies" />

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric icon={Building2} label="Companies" value={companies.length} />
          <Metric
            icon={CircleDashed}
            label="Pending review"
            value={pendingCount}
          />
          <Metric
            icon={UsersRound}
            label="Career records"
            value={relationshipCount}
          />
        </div>

        <Card className="gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
          <CardHeader className="border-b border-border/70 px-4 py-4 md:px-6">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search companies"
                className="h-11 bg-background/70 pl-9"
                placeholder="Search display name, legal name, domain, or alias"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
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
                      href={`/admin/members/companies/${company.id}`}
                      className="group grid min-h-24 gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-6"
                    >
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
                            "Community submitted"}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                        <span className="inline-flex items-center gap-1 text-foreground">
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
                  Try a broader name, domain, or alias.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <Card className="gap-0 border-white/10 bg-card/90 py-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xl font-semibold">{value}</span>
          <span className="block text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}
