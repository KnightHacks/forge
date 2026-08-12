"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  Download,
  Loader2,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { AdminMemberListInput } from "@forge/validators";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";
import { adminMemberPageSizes } from "@forge/validators";

import {
  adminPageClassName,
  AdminPageHeader,
  adminPageStackClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatUtcDate } from "~/lib/dates";
import { api } from "~/trpc/react";
import {
  AlumniBadge,
  graduatedDateClassName,
  graduatedNameClassName,
  nameClassName,
} from "./alumni-status";
import { InvalidateDuesDialog } from "./invalidate-dues-dialog";
import { MemberDetailDialog } from "./member-detail-dialog";
import { MemberFilters } from "./member-filters";
import { buildAdminMemberSearchParams } from "./params";

type DashboardData = RouterOutputs["memberAdmin"]["getAdminMembers"];
type MemberDetail = RouterOutputs["memberAdmin"]["getAdminMember"];
type DuesPaymentConfiguration =
  RouterOutputs["memberAdmin"]["getDuesPaymentConfiguration"];
type DashboardMember = DashboardData["members"][number];
type FilterField =
  | "alumni"
  | "company"
  | "dues"
  | "gender"
  | "gradStatus"
  | "gradYear"
  | "joinedFrom"
  | "joinedTo"
  | "level"
  | "major"
  | "race"
  | "role"
  | "school"
  | "visibility";

interface ActiveFilter {
  field: FilterField;
  label: string;
  value: number | string;
}

function formatDate(date: string) {
  return formatUtcDate(date);
}

function clearAllFilters(input: AdminMemberListInput): AdminMemberListInput {
  return {
    ...input,
    alumniConfirmations: [],
    companies: [],
    duesStatuses: [],
    genders: [],
    graduationStatuses: [],
    graduationYears: [],
    guildVisibilities: [],
    joinedFrom: undefined,
    joinedTo: undefined,
    levelsOfStudy: [],
    majors: [],
    page: 1,
    racesOrEthnicities: [],
    roleIds: [],
    schools: [],
  };
}

function getActiveFilters(
  input: AdminMemberListInput,
  roles: DashboardData["filterOptions"]["roles"],
): ActiveFilter[] {
  const roleNames = new Map(roles.map((role) => [role.id, role.name] as const));
  return [
    ...input.duesStatuses.map((value) => ({
      field: "dues" as const,
      label: `Dues: ${value}`,
      value,
    })),
    ...input.schools.map((value) => ({
      field: "school" as const,
      label: `School: ${value}`,
      value,
    })),
    ...input.majors.map((value) => ({
      field: "major" as const,
      label: `Major: ${value}`,
      value,
    })),
    ...input.levelsOfStudy.map((value) => ({
      field: "level" as const,
      label: `Level: ${value}`,
      value,
    })),
    ...input.graduationYears.map((value) => ({
      field: "gradYear" as const,
      label: `Graduates: ${value}`,
      value,
    })),
    ...input.companies.map((value) => ({
      field: "company" as const,
      label: `Company: ${value}`,
      value,
    })),
    ...input.guildVisibilities.map((value) => ({
      field: "visibility" as const,
      label: `Guild: ${value}`,
      value,
    })),
    ...input.graduationStatuses.map((value) => ({
      field: "gradStatus" as const,
      label: `Graduation: ${value}`,
      value,
    })),
    ...input.alumniConfirmations.map((value) => ({
      field: "alumni" as const,
      label: `Alumni: ${value}`,
      value,
    })),
    ...input.genders.map((value) => ({
      field: "gender" as const,
      label: `Gender: ${value}`,
      value,
    })),
    ...input.racesOrEthnicities.map((value) => ({
      field: "race" as const,
      label: `Race/ethnicity: ${value}`,
      value,
    })),
    ...input.roleIds.map((value) => ({
      field: "role" as const,
      label: `Role: ${roleNames.get(value) ?? "Unknown role"}`,
      value,
    })),
    ...(input.joinedFrom
      ? [
          {
            field: "joinedFrom" as const,
            label: `Joined from: ${input.joinedFrom}`,
            value: input.joinedFrom,
          },
        ]
      : []),
    ...(input.joinedTo
      ? [
          {
            field: "joinedTo" as const,
            label: `Joined through: ${input.joinedTo}`,
            value: input.joinedTo,
          },
        ]
      : []),
  ];
}

function removeFilter(
  input: AdminMemberListInput,
  filter: ActiveFilter,
): AdminMemberListInput {
  const without = <Value extends number | string>(values: Value[]) =>
    values.filter((value) => value !== filter.value);
  const next = { ...input, page: 1 };

  switch (filter.field) {
    case "dues":
      return { ...next, duesStatuses: without(input.duesStatuses) };
    case "school":
      return { ...next, schools: without(input.schools) };
    case "major":
      return { ...next, majors: without(input.majors) };
    case "level":
      return { ...next, levelsOfStudy: without(input.levelsOfStudy) };
    case "gradYear":
      return { ...next, graduationYears: without(input.graduationYears) };
    case "company":
      return { ...next, companies: without(input.companies) };
    case "visibility":
      return { ...next, guildVisibilities: without(input.guildVisibilities) };
    case "gradStatus":
      return {
        ...next,
        graduationStatuses: without(input.graduationStatuses),
      };
    case "alumni":
      return {
        ...next,
        alumniConfirmations: without(input.alumniConfirmations),
      };
    case "gender":
      return { ...next, genders: without(input.genders) };
    case "race":
      return {
        ...next,
        racesOrEthnicities: without(input.racesOrEthnicities),
      };
    case "role":
      return { ...next, roleIds: without(input.roleIds) };
    case "joinedFrom":
      return { ...next, joinedFrom: undefined };
    case "joinedTo":
      return { ...next, joinedTo: undefined };
  }
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: "asc" | "desc";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-sm py-1 text-left font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        )
      ) : (
        <ArrowDownUp className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}

function DuesStatusControl({
  canEdit,
  isPending,
  member,
  onToggle,
}: {
  canEdit: boolean;
  isPending: boolean;
  member: DashboardMember;
  onToggle: () => void;
}) {
  const badge = (
    <Badge variant={member.duesStatus.paid ? "default" : "secondary"}>
      {member.duesStatus.paid ? "Paid" : "Unpaid"}
    </Badge>
  );

  if (!canEdit) return badge;

  const fullName = `${member.firstName} ${member.lastName}`;
  return (
    <button
      type="button"
      aria-label={`${member.duesStatus.paid ? "Revoke" : "Grant"} dues for ${fullName}`}
      aria-pressed={member.duesStatus.paid}
      className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:min-h-9"
      disabled={isPending}
      onClick={onToggle}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        badge
      )}
    </button>
  );
}

export function MemberAdminDashboard({
  canEdit,
  data,
  detail,
  duesPaymentConfiguration,
  input,
  isOfficer,
}: {
  canEdit: boolean;
  data: DashboardData;
  detail: MemberDetail | null;
  duesPaymentConfiguration: DuesPaymentConfiguration;
  input: AdminMemberListInput;
  isOfficer: boolean;
}) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [pendingDuesMemberId, setPendingDuesMemberId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState(input.query);
  const activeFilters = useMemo(
    () => getActiveFilters(input, data.filterOptions.roles),
    [data.filterOptions.roles, input],
  );
  const exportQuery = api.memberAdmin.exportAdminMembers.useQuery(input, {
    enabled: false,
  });
  const dues = api.memberAdmin.setAdminDuesStatus.useMutation({
    onSuccess(_result, variables) {
      toast.success(variables.paid ? "Dues granted." : "Dues revoked.");
      startTransition(() => router.refresh());
    },
    onError(error) {
      toast.error(error.message || "Dues status could not be updated.");
    },
    onSettled() {
      setPendingDuesMemberId(null);
    },
  });
  const paymentAvailability =
    api.memberAdmin.setDuesPaymentsEnabled.useMutation({
      onSuccess(result) {
        toast.success(
          result.paymentsEnabled
            ? "Member dues payments enabled."
            : "Member dues payments paused.",
        );
        startTransition(() => router.refresh());
      },
      onError(error) {
        toast.error(
          error.message || "Dues payment availability could not be updated.",
        );
      },
    });
  const paymentsEnabled = paymentAvailability.isPending
    ? paymentAvailability.variables.paymentsEnabled
    : (paymentAvailability.data?.paymentsEnabled ??
      duesPaymentConfiguration.paymentsEnabled);

  const navigate = useCallback(
    (next: AdminMemberListInput, selectedMemberId?: string | null) => {
      const params = buildAdminMemberSearchParams(next, selectedMemberId);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `/admin/members?${query}` : "/admin/members");
      });
    },
    [router],
  );

  useEffect(() => {
    if (search.trim() === input.query) return;
    const timeout = window.setTimeout(() => {
      navigate({ ...input, page: 1, query: search.trim() }, null);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [input, navigate, search]);

  const changeSort = (sortField: AdminMemberListInput["sortField"]) => {
    const sortDirection =
      input.sortField === sortField && input.sortDirection === "asc"
        ? "desc"
        : "asc";
    navigate({ ...input, page: 1, sortDirection, sortField }, null);
  };

  const downloadCsv = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) {
      toast.error(result.error?.message || "Member CSV could not be created.");
      return;
    }
    const blob = new Blob([result.data.content], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    startTransition(() => router.refresh());
  };
  const closeDetail = () => navigate(input, null);
  const toggleDues = (member: DashboardMember) => {
    setPendingDuesMemberId(member.id);
    dues.mutate({
      memberId: member.id,
      paid: !member.duesStatus.paid,
    });
  };

  const { page, pageCount, pageSize, totalCount } = data.pagination;
  const firstResult = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, totalCount);

  return (
    <main className={adminPageClassName}>
      <div className={adminPageStackClassName}>
        <AdminPageHeader
          actions={
            <>
              <div className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Member payments
                  </p>
                  <p className="text-sm font-semibold">
                    {paymentsEnabled ? "Enabled" : "Paused"}
                  </p>
                </div>
                {canEdit ? (
                  <Switch
                    aria-label="Allow member dues payments"
                    checked={paymentsEnabled}
                    disabled={paymentAvailability.isPending}
                    onCheckedChange={(enabled) => {
                      paymentAvailability.mutate({
                        paymentsEnabled: enabled,
                      });
                    }}
                  />
                ) : (
                  <Badge variant="outline">
                    {paymentsEnabled ? "Open" : "Closed"}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2"
                disabled={exportQuery.isFetching}
                onClick={() => void downloadCsv()}
              >
                {exportQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </Button>
              {isOfficer && <InvalidateDuesDialog onComplete={refresh} />}
            </>
          }
          description="Find member records, manage current dues, and keep profile data accurate."
          eyebrow={ADMIN_PAGE_EYEBROWS.members}
          icon={UsersRound}
          title="Members"
        />

        <Card className="w-full min-w-0 gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
          <CardHeader className="min-w-0 border-b border-border/70 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search members"
                  className="h-11 bg-background/70 pl-9"
                  placeholder="Search name, email, Discord, company, or school"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MemberFilters
                  input={input}
                  options={data.filterOptions}
                  onApply={(next) => navigate(next, null)}
                />
                <Select
                  value={String(input.pageSize)}
                  onValueChange={(value) =>
                    navigate(
                      {
                        ...input,
                        page: 1,
                        pageSize: Number(
                          value,
                        ) as AdminMemberListInput["pageSize"],
                      },
                      null,
                    )
                  }
                >
                  <SelectTrigger
                    className="h-11 w-32 bg-background/70"
                    aria-label="Rows per page"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminMemberPageSizes.map((size) => (
                      <SelectItem
                        key={size}
                        value={String(size)}
                        className="min-h-11"
                      >
                        {size} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-3">
                {activeFilters.map((filter) => (
                  <button
                    key={`${filter.field}-${filter.value}`}
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-sm text-primary hover:bg-primary/15"
                    onClick={() => navigate(removeFilter(input, filter), null)}
                  >
                    <span className="max-w-56 truncate">{filter.label}</span>
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(clearAllFilters(input), null)}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent aria-busy={isNavigating} className="px-0 py-0">
            {isNavigating && (
              <div
                aria-live="polite"
                className="flex items-center gap-2 border-b border-border/70 bg-primary/5 px-4 py-2 text-sm text-muted-foreground md:px-6"
              >
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                Updating results
              </div>
            )}

            {data.members.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <UsersRound className="h-6 w-6" />
                </div>
                <CardTitle>No members found</CardTitle>
                <p className="max-w-md text-sm text-muted-foreground">
                  Try a broader search or clear filters to return to the full
                  member list.
                </p>
                {(activeFilters.length > 0 || input.query) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      navigate({ ...clearAllFilters(input), query: "" }, null);
                    }}
                  >
                    Reset search and filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "hidden overflow-x-auto transition-opacity duration-150 motion-reduce:transition-none md:block",
                    isNavigating && "opacity-70",
                  )}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <SortButton
                            label="Name"
                            active={input.sortField === "name"}
                            direction={input.sortDirection}
                            onClick={() => changeSort("name")}
                          />
                        </TableHead>
                        <TableHead>
                          <SortButton
                            label="Discord"
                            active={input.sortField === "discord"}
                            direction={input.sortDirection}
                            onClick={() => changeSort("discord")}
                          />
                        </TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Graduation</TableHead>
                        <TableHead>Dues</TableHead>
                        <TableHead>
                          <SortButton
                            label="Joined"
                            active={input.sortField === "joined"}
                            direction={input.sortDirection}
                            onClick={() => changeSort("joined")}
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                aria-label={`View ${member.firstName} ${member.lastName}`}
                                className={cn(
                                  "inline-flex min-h-11 items-center rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
                                  member.graduated
                                    ? graduatedNameClassName
                                    : nameClassName,
                                )}
                                onClick={() => navigate(input, member.id)}
                              >
                                {member.firstName} {member.lastName}
                              </button>
                              {member.alumniConfirmed && <AlumniBadge />}
                            </div>
                          </TableCell>
                          <TableCell>@{member.discordUser}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell className="max-w-52 truncate">
                            {member.school}
                          </TableCell>
                          <TableCell
                            className={cn(
                              member.graduated && graduatedDateClassName,
                            )}
                          >
                            {member.graduation.gradTerm}{" "}
                            {member.graduation.gradYear}
                          </TableCell>
                          <TableCell>
                            <DuesStatusControl
                              canEdit={canEdit}
                              isPending={pendingDuesMemberId === member.id}
                              member={member}
                              onToggle={() => toggleDues(member)}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(member.dateCreated)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div
                  className={cn(
                    "grid min-w-0 gap-2 p-2 transition-opacity duration-150 motion-reduce:transition-none sm:gap-3 sm:p-3 md:hidden",
                    isNavigating && "opacity-70",
                  )}
                >
                  {data.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex min-h-20 w-full min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-background/60 pr-2 hover:border-primary/35 sm:min-h-24 sm:gap-2 sm:pr-3"
                    >
                      <button
                        type="button"
                        aria-label={`View ${member.firstName} ${member.lastName}`}
                        className={cn(
                          "flex min-h-20 min-w-0 flex-1 items-center p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-24 sm:p-4",
                          member.graduated
                            ? graduatedNameClassName
                            : nameClassName,
                        )}
                        onClick={() => navigate(input, member.id)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            @{member.discordUser}
                          </span>
                        </span>
                      </button>
                      {member.alumniConfirmed && <AlumniBadge />}
                      <DuesStatusControl
                        canEdit={canEdit}
                        isPending={pendingDuesMemberId === member.id}
                        member={member}
                        onToggle={() => toggleDues(member)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex min-w-0 flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4 md:px-6">
              <p className="text-sm text-muted-foreground">
                Showing {firstResult}-{lastResult} of {totalCount} members
              </p>
              <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                <span className="col-span-2 row-start-1 min-w-0 text-center text-sm sm:order-2 sm:col-auto sm:min-w-24">
                  Page {page} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full px-2 sm:order-1 sm:w-auto sm:px-4"
                  disabled={page <= 1 || isNavigating}
                  onClick={() => navigate({ ...input, page: page - 1 }, null)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full px-2 sm:order-3 sm:w-auto sm:px-4"
                  disabled={page >= pageCount || isNavigating}
                  onClick={() => navigate({ ...input, page: page + 1 }, null)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {detail && (
        <MemberDetailDialog
          key={detail.member.id}
          canEdit={canEdit}
          detail={detail}
          onClose={closeDetail}
          onChanged={refresh}
          onDeleted={() => {
            closeDetail();
            refresh();
          }}
        />
      )}
    </main>
  );
}
