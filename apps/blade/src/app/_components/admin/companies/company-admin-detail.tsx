"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  GitMerge,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Trash2,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { CAREER } from "@forge/consts";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
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
import {
  checkUploadMetadata,
  COMPANY_IMAGE_UPLOAD_POLICY,
  uploadAccept,
} from "@forge/validators";

import { adminPageClassName } from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatUtcShortMonth } from "~/lib/dates";
import { api } from "~/trpc/react";
import { CompanyAdminMark } from "./company-admin-mark";

type CompanyDetail = RouterOutputs["career"]["getAdminCompany"];
type CompanySummary = RouterOutputs["career"]["listAdminCompanies"][number];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Company image could not be read."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Company image could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

function monthLabel(month: string | null) {
  if (!month) return null;
  return formatUtcShortMonth(month);
}

function reviewClass(state: string) {
  if (state === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (state === "pending") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  if (state === "merged") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  return "border-destructive/30 bg-destructive/10 text-destructive-foreground";
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
  const [logoUrl, setLogoUrl] = useState(detail.company.logoUrl);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
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
  const uploadImage = api.career.uploadCompanyImage.useMutation({
    onSuccess(result) {
      setLogoUrl(result.logoUrl);
      toast.success("Company image updated.");
      refresh();
    },
    onError(error) {
      toast.error(error.message || "Company image could not be uploaded.");
    },
  });
  const removeImage = api.career.removeCompanyImage.useMutation({
    onSuccess() {
      setLogoUrl(null);
      toast.success("Company image removed.");
      refresh();
    },
    onError(error) {
      toast.error(error.message || "Company image could not be removed.");
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
      setMergeOpen(false);
      router.replace(`/admin/companies/${mergeTargetId}`);
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
  const imagePending = uploadImage.isPending || removeImage.isPending;

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    const check = checkUploadMetadata(COMPANY_IMAGE_UPLOAD_POLICY, {
      contentType: file.type,
      fileName: file.name,
      size: file.size,
    });
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    try {
      const fileContent = await fileToDataUrl(file);
      await uploadImage.mutateAsync({
        companyId: detail.company.id,
        fileContent,
        fileName: file.name,
      });
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  return (
    <main className={adminPageClassName}>
      <Button asChild variant="ghost" className="-ml-3 gap-2">
        <Link href="/admin/companies">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All companies
        </Link>
      </Button>

      <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyAdminMark
            displayName={detail.company.displayName}
            imageUrl={logoUrl}
            large
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-primary">
                <BriefcaseBusiness className="size-4" aria-hidden="true" />
                {ADMIN_PAGE_EYEBROWS.companyDetail}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "w-fit capitalize",
                  reviewClass(detail.company.reviewState),
                )}
              >
                {detail.company.reviewState}
              </Badge>
            </div>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl">
              {detail.company.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.employment.length} career{" "}
              {detail.employment.length === 1 ? "record" : "records"}
            </p>
          </div>
        </div>
        {detail.company.reviewState === "approved" ? (
          <Button asChild variant="outline" className="w-fit gap-2">
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

      {canEdit &&
      detail.company.reviewState !== "merged" &&
      detail.company.reviewState !== "approved" ? (
        <section className="mt-8 flex flex-col gap-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Review this company</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Confirm the name and domain, then approve it for public Guild
              company pages or reject it from public results.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="w-fit gap-2"
              disabled={approve.isPending || reject.isPending}
              onClick={() => approve.mutate({ companyId: detail.company.id })}
            >
              {approve.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Approve company
            </Button>
            {detail.company.reviewState !== "rejected" ? (
              <Button
                type="button"
                variant="outline"
                className="w-fit gap-2 border-destructive/30 text-destructive-foreground"
                disabled={approve.isPending || reject.isPending}
                onClick={() => reject.mutate({ companyId: detail.company.id })}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <Card className="mt-6 gap-0 border-white/10 bg-card/95 py-0">
        <CardHeader className="border-b border-border/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Company identity</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The name, image, and search terms shown across Blade and Guild.
              </p>
            </div>
            {canEdit && detail.company.reviewState !== "merged" ? (
              <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-fit gap-2">
                    <GitMerge className="h-4 w-4" aria-hidden="true" />
                    Merge duplicate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg border-white/10 bg-card/95">
                  <DialogHeader>
                    <DialogTitle>Merge company record</DialogTitle>
                    <DialogDescription>
                      Every career record for {detail.company.displayName} will
                      move to the canonical company. This name will remain as an
                      alias.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="merge-company">Canonical company</Label>
                    <Select
                      value={mergeTargetId}
                      onValueChange={setMergeTargetId}
                    >
                      <SelectTrigger id="merge-company" className="h-11">
                        <SelectValue placeholder="Choose a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {mergeTargets.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit gap-2"
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
                      Merge record
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex flex-col items-start gap-3 lg:w-52">
              <CompanyAdminMark
                className="h-24 w-24"
                displayName={displayName}
                imageUrl={logoUrl}
                large
              />
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent">
                    {uploadImage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    )}
                    {logoUrl ? "Replace" : "Upload image"}
                    <Input
                      type="file"
                      accept={uploadAccept(COMPANY_IMAGE_UPLOAD_POLICY)}
                      className="sr-only"
                      disabled={imagePending}
                      onChange={(event) => {
                        void handleImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </Label>
                  {logoUrl ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      disabled={imagePending}
                      onClick={() =>
                        removeImage.mutate({ companyId: detail.company.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Remove company image</span>
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground">
                PNG, JPEG, GIF, or WebP. Up to 2MB.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                className="sm:col-span-2"
                disabled={!canEdit}
                id="company-aliases"
                label="Aliases"
                description="Comma separated names that members may search."
                placeholder="Advanced Micro Devices, Inc."
                value={aliases}
                onChange={setAliases}
              />
              {canEdit ? (
                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="button"
                    className="w-fit gap-2"
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
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    Save changes
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 gap-0 border-white/10 bg-card/95 py-0">
        <CardHeader className="border-b border-border/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Member career history</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Current, former, and imported relationships in one place.
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {detail.employment.length} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {groups.length > 0 ? (
            groups.map((group) => (
              <section
                key={group.label}
                className="border-t border-border/70 first:border-t-0"
              >
                <div className="flex items-center gap-2 bg-background/35 px-5 py-3">
                  <h2 className="text-sm font-semibold">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y divide-border/70">
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
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {employment.firstName} {employment.lastName}
                          </p>
                          {employment.title ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {employment.title}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {employment.experienceType ? (
                              <Badge
                                variant="outline"
                                className="w-fit max-w-full gap-2 border-white/10"
                              >
                                <BriefcaseBusiness
                                  className="h-3.5 w-3.5 shrink-0"
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
                                className="w-fit max-w-full gap-2 border-white/10"
                              >
                                <MapPin
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {employment.city.label}
                                </span>
                              </Badge>
                            ) : null}
                            {!employment.guildVisible ? (
                              <span className="text-xs text-muted-foreground">
                                Hidden on Guild
                              </span>
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
                </div>
              </section>
            ))
          ) : (
            <div className="py-16 text-center">
              <BriefcaseBusiness
                className="mx-auto h-9 w-9 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="mt-3 font-semibold">No career records</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No member has connected this company to their history yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && detail.company.reviewState === "approved" ? (
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-destructive"
            disabled={reject.isPending}
            onClick={() => reject.mutate({ companyId: detail.company.id })}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Remove from public Guild
          </Button>
        </div>
      ) : null}
    </main>
  );
}

function Field({
  className,
  description,
  disabled,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  description?: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
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
