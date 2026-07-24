"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  GitMerge,
  Loader2,
  MapPin,
  Save,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { CAREER } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type CompanyDetail = RouterOutputs["career"]["getAdminCompany"];
type CompanySummary = RouterOutputs["career"]["listAdminCompanies"][number];

function monthLabel(month: string | null) {
  if (!month) return null;
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function CompanyAdminDetail({
  allCompanies,
  canEdit,
  detail,
}: {
  allCompanies: CompanySummary[];
  canEdit: boolean;
  detail: CompanyDetail;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(detail.company.displayName);
  const [legalName, setLegalName] = useState(detail.company.legalName ?? "");
  const [domain, setDomain] = useState(detail.company.domain ?? "");
  const [aliases, setAliases] = useState(detail.company.aliases.join(", "));
  const [mergeTargetId, setMergeTargetId] = useState("");
  const mergeTargets = useMemo(
    () =>
      allCompanies.filter(
        (company) =>
          company.id !== detail.company.id &&
          company.reviewState !== "merged" &&
          company.reviewState !== "rejected",
      ),
    [allCompanies, detail.company.id],
  );
  const refresh = () => startTransition(() => router.refresh());
  const updateCompany = api.career.updateCompany.useMutation({
    onSuccess() {
      toast.success("Company details saved.");
      refresh();
    },
    onError(error) {
      toast.error(error.message || "Company details could not be saved.");
    },
  });
  const approve = api.career.approveCompany.useMutation({
    onSuccess() {
      toast.success("Company approved for the public Guild.");
      refresh();
    },
    onError(error) {
      toast.error(error.message || "Company could not be approved.");
    },
  });
  const reject = api.career.rejectCompany.useMutation({
    onSuccess() {
      toast.success("Company hidden from public Guild surfaces.");
      refresh();
    },
    onError(error) {
      toast.error(error.message || "Company could not be rejected.");
    },
  });
  const merge = api.career.mergeCompanies.useMutation({
    onSuccess() {
      toast.success("Company records merged.");
      router.replace(`/admin/members/companies/${mergeTargetId}`);
      router.refresh();
    },
    onError(error) {
      toast.error(error.message || "Companies could not be merged.");
    },
  });
  const groups = [
    {
      items: detail.employment.filter((item) => item.state === "current"),
      label: "Current",
    },
    {
      items: detail.employment.filter((item) => item.state === "past"),
      label: "Former",
    },
    {
      items: detail.employment.filter((item) => item.state === "unknown"),
      label: "Unconfirmed legacy",
    },
  ].filter((group) => group.items.length > 0);

  return (
    <main className="container min-w-0 px-3 pb-12 pt-4 sm:px-8 sm:pb-16 sm:pt-6 md:pt-10">
      <Button asChild variant="ghost" className="-ml-3 gap-2">
        <Link href="/admin/members/companies">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All companies
        </Link>
      </Button>

      <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Company intelligence
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.company.displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.employment.length} career{" "}
            {detail.employment.length === 1 ? "record" : "records"} ·{" "}
            {detail.company.reviewState}
          </p>
        </div>
        {detail.company.reviewState === "approved" ? (
          <Button asChild variant="outline" className="gap-2">
            <a
              href={`https://guild.knighthacks.org/companies/${detail.company.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Public page
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <Card className="gap-0 border-white/10 bg-card/95 py-0">
            <CardHeader className="border-b border-border/70 p-5">
              <CardTitle>Company record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <Field
                disabled={!canEdit}
                id="company-display-name"
                label="Display name"
                value={displayName}
                onChange={setDisplayName}
              />
              <Field
                disabled={!canEdit}
                id="company-legal-name"
                label="Legal name"
                placeholder="Optional"
                value={legalName}
                onChange={setLegalName}
              />
              <Field
                disabled={!canEdit}
                id="company-domain"
                label="Domain"
                placeholder="example.com"
                value={domain}
                onChange={setDomain}
              />
              <Field
                disabled={!canEdit}
                id="company-aliases"
                label="Aliases"
                description="Comma separated. Use common names people may search."
                placeholder="Advanced Micro Devices, Inc."
                value={aliases}
                onChange={setAliases}
              />
              {canEdit ? (
                <Button
                  type="button"
                  className="w-full gap-2"
                  disabled={updateCompany.isPending || isRefreshing}
                  onClick={() =>
                    updateCompany.mutate({
                      aliases: aliases
                        .split(",")
                        .map((alias) => alias.trim())
                        .filter(Boolean),
                      companyId: detail.company.id,
                      displayName,
                      domain,
                      legalName,
                    })
                  }
                >
                  {updateCompany.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save company
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {canEdit ? (
            <Card className="gap-0 border-white/10 bg-card/95 py-0">
              <CardHeader className="border-b border-border/70 p-5">
                <CardTitle>Review and cleanup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  Approving makes the company and its opted-in histories public.
                  Rejecting hides it. Merging moves every career record to the
                  selected canonical company and preserves this name as an
                  alias.
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.company.reviewState !== "approved" &&
                  detail.company.reviewState !== "merged" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-emerald-500/30 text-emerald-300"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate({ companyId: detail.company.id })
                      }
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                  ) : null}
                  {detail.company.reviewState !== "rejected" &&
                  detail.company.reviewState !== "merged" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-destructive/30 text-destructive-foreground"
                      disabled={reject.isPending}
                      onClick={() =>
                        reject.mutate({ companyId: detail.company.id })
                      }
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Reject
                    </Button>
                  ) : null}
                </div>
                {detail.company.reviewState !== "merged" ? (
                  <div className="space-y-2 border-t border-border/70 pt-4">
                    <Label htmlFor="merge-company">
                      Merge this record into
                    </Label>
                    <Select
                      value={mergeTargetId}
                      onValueChange={setMergeTargetId}
                    >
                      <SelectTrigger id="merge-company" className="h-11">
                        <SelectValue placeholder="Choose canonical company" />
                      </SelectTrigger>
                      <SelectContent>
                        {mergeTargets.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      disabled={!mergeTargetId || merge.isPending}
                      onClick={() =>
                        merge.mutate({
                          canonicalCompanyId: mergeTargetId,
                          duplicateCompanyId: detail.company.id,
                        })
                      }
                    >
                      {merge.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <GitMerge className="h-4 w-4" aria-hidden="true" />
                      )}
                      Merge into selected company
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {groups.length > 0 ? (
            groups.map((group) => (
              <Card
                key={group.label}
                className="gap-0 border-white/10 bg-card/95 py-0"
              >
                <CardHeader className="flex-row items-center justify-between border-b border-border/70 p-5">
                  <CardTitle>{group.label}</CardTitle>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </CardHeader>
                <CardContent className="divide-y divide-border/70 p-0">
                  {group.items.map((employment) => {
                    const dates = [
                      monthLabel(employment.startMonth),
                      employment.state === "current"
                        ? "Present"
                        : monthLabel(employment.endMonth),
                    ]
                      .filter(Boolean)
                      .join(" – ");
                    return (
                      <div
                        key={employment.id}
                        className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {employment.firstName} {employment.lastName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {employment.title ?? "Role not confirmed"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {employment.experienceType ? (
                              <Badge
                                variant="outline"
                                className="gap-1.5 border-white/10"
                              >
                                <BriefcaseBusiness
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {
                                  CAREER.EMPLOYMENT_EXPERIENCE_LABELS[
                                    employment.experienceType
                                  ]
                                }
                              </Badge>
                            ) : null}
                            {employment.city ? (
                              <Badge
                                variant="outline"
                                className="gap-1.5 border-white/10"
                              >
                                <MapPin
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {employment.city.label}
                              </Badge>
                            ) : null}
                            {!employment.guildVisible ? (
                              <Badge variant="secondary">
                                Private on Guild
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {dates ? (
                          <p className="text-xs text-muted-foreground sm:text-right">
                            {dates}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-white/10 bg-card/95">
              <CardContent className="py-16 text-center">
                <BriefcaseBusiness
                  className="mx-auto h-9 w-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-semibold">No career records</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This company is not connected to a member history yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  description,
  disabled,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  description?: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
