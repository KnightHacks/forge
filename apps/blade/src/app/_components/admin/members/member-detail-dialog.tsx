"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  GraduationCap,
  Hash,
  IdCard,
  Loader2,
  MapPin,
  MessageSquareText,
  Pencil,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  AdminMemberEditableProfileValues,
  MemberSettingsFieldDefinition,
} from "@forge/validators";
import { CAREER, GUILD } from "@forge/consts";
import { cn } from "@forge/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";
import {
  ADMIN_MEMBER_DELETE_CONFIRMATION,
  adminMemberEditableProfileSchema,
  checkUploadMetadata,
  formatDuesAmount,
  memberSettingsFields,
  PROFILE_PICTURE_UPLOAD_POLICY,
  RESUME_UPLOAD_POLICY,
  uploadAccept,
} from "@forge/validators";

import {
  DetailSection,
  SummaryMetric,
} from "~/app/_components/admin/shared/detail-panel";
import { DiscordActivityTracker } from "~/app/_components/admin/shared/discord-activity-tracker";
import { DiscordEngagementMetrics } from "~/app/_components/admin/shared/discord-engagement-metrics";
import {
  memberProfileFormDefaults,
  MemberSettingsFieldControl,
} from "~/app/_components/member/member-profile-settings-form";
import {
  formatClubDate,
  formatClubDateTime,
  formatUtcDate,
  formatUtcDateTime,
  formatUtcShortMonth,
} from "~/lib/dates";
import { api } from "~/trpc/react";
import { AlumniBadge, graduatedDateClassName } from "./alumni-status";

type AdminMemberDetail = RouterOutputs["memberAdmin"]["getAdminMember"];
type SettingsSection = MemberSettingsFieldDefinition["section"];

const sectionOrder: SettingsSection[] = ["Personal", "Academics", "Guild"];
const sectionTitles = {
  Personal: "Personal details",
  Academics: "Academic details",
  Guild: "Guild profile",
} satisfies Record<SettingsSection, string>;

function display(value: boolean | number | string | null | undefined) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null || value === "") return "Not provided";
  return String(value);
}

const DATE_ONLY_COLUMN = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not provided";
  // Date of birth, graduation date and day keys are date-only columns, so they
  // stay in UTC. Anything else is a real instant and belongs in club time.
  if (typeof value === "string" && DATE_ONLY_COLUMN.test(value)) {
    return formatUtcDate(value, "Not provided");
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatClubDate(date, "Not provided");
}

function formatTimestamp(
  value: Date | string | null | undefined,
  empty = "Not recorded",
) {
  if (!value) return empty;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatClubDateTime(date, empty);
}

function formatJoined(date: string, time: string) {
  // `dateCreated`/`timeCreated` are zoneless `date` + `time` columns, so the
  // stored wall clock is what we show. Reading it back as UTC keeps the output
  // identical for every viewer instead of following the browser.
  const joined = new Date(`${date}T${time}Z`);
  if (Number.isNaN(joined.getTime())) return formatDate(date);
  return formatUtcDateTime(joined);
}

function formatMonth(value: string | null) {
  if (!value) return null;
  return formatUtcShortMonth(value);
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function DetailValue({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function ProfileLink({ href }: { href: string | null }) {
  if (!href) return "Not provided";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-2 text-primary hover:underline"
    >
      <span className="min-w-0 break-all">{href}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

function MemberOverviewMetrics({ detail }: { detail: AdminMemberDetail }) {
  return (
    <section
      aria-label="Member profile summary"
      className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      <SummaryMetric label="Blade points" value={detail.member.points} />
      <SummaryMetric
        label="Events attended"
        value={detail.engagement.distinctEventCount}
      />
      <SummaryMetric
        label="Discord messages"
        value={formatNumber(detail.discord.messageCount)}
      />
      <SummaryMetric
        label="Dues status"
        value={detail.duesStatus.paid ? "Paid" : "Unpaid"}
      />
      <SummaryMetric label="Linked roles" value={detail.roles.length} />
      <SummaryMetric label="Career entries" value={detail.employment.length} />
    </section>
  );
}

function EventEngagement({ detail }: { detail: AdminMemberDetail }) {
  return (
    <DetailSection
      title="Event engagement"
      icon={CalendarDays}
      description="Complete recorded event check-in history, including the operator and awarded points."
    >
      <div className="grid grid-cols-3 gap-2 border-b border-border/70 p-3 sm:p-4">
        <SummaryMetric
          label="Distinct events"
          value={detail.engagement.distinctEventCount}
        />
        <SummaryMetric
          label="Check-in records"
          value={detail.engagement.eventCheckInCount}
        />
        <SummaryMetric
          label="Event points"
          value={formatNumber(detail.engagement.eventPointsAwarded)}
        />
      </div>
      {detail.events.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No event check-ins are recorded for this member.
        </p>
      ) : (
        <div
          aria-label="Member event attendance history"
          className="max-h-80 divide-y divide-border/70 overflow-y-auto"
          role="region"
          tabIndex={0}
        >
          {detail.events.map((event) => (
            <div
              key={event.attendanceId}
              className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 font-medium">{event.name}</p>
                  <Badge variant="outline" className="shrink-0">
                    {event.tag}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTimestamp(event.startAt)} · {event.location}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.checkedInAt
                    ? `Checked in ${formatTimestamp(event.checkedInAt)}`
                    : "Check-in time not recorded"}{" "}
                  · Recorded by {event.checkedInBy}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="font-mono font-medium tabular-nums">
                  {event.pointsAwarded == null
                    ? "No points"
                    : `${formatNumber(event.pointsAwarded)} pts`}
                </p>
                {event.pointsAwardedEstimated ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimated award
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function DiscordEngagement({ detail }: { detail: AdminMemberDetail }) {
  const channelPeak = Math.max(
    1,
    ...detail.discord.topChannels.map((channel) => channel.count),
  );

  return (
    <DetailSection
      title="Discord engagement"
      icon={MessageSquareText}
      description="Human-authored, non-deleted messages matched through the member's stable Discord account."
    >
      <DiscordEngagementMetrics
        activeChannelCount={detail.discord.activeChannelCount}
        activeDayCount={detail.discord.activeDayCount}
        currentStreakDays={detail.discord.currentStreakDays}
        lastMessage={formatTimestamp(
          detail.discord.lastMessageAt,
          "No messages",
        )}
        longestStreakDays={detail.discord.longestStreakDays}
        messageCount={detail.discord.messageCount}
      />
      <DiscordActivityTracker
        activity={detail.discord.activity}
        activityEndDate={detail.discord.activityEndDate}
      />
      <div className="border-t border-border/70 px-3 py-4 sm:px-4">
        <div className="flex items-center gap-2">
          <Hash className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-semibold">Most active channels</h4>
        </div>
        {detail.discord.topChannels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No archived Discord messages are matched to this member.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {detail.discord.topChannels.map((channel) => (
              <div key={`${channel.name}-${channel.isThread}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">
                    #{channel.name}
                    {channel.isThread ? (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        thread
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {formatNumber(channel.count)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/75"
                    style={{
                      width: `${(channel.count / channelPeak) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailSection>
  );
}

function EmploymentHistory({ detail }: { detail: AdminMemberDetail }) {
  return (
    <DetailSection
      title="Employment history"
      icon={BriefcaseBusiness}
      description="Current, former, and imported Guild career relationships."
    >
      {detail.employment.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No employment history has been added.
        </p>
      ) : (
        <div className="divide-y divide-border/70">
          {detail.employment.map((employment) => {
            const dates = [
              formatMonth(employment.startMonth),
              employment.state === "current"
                ? "Present"
                : formatMonth(employment.endMonth),
            ]
              .filter(Boolean)
              .join(" – ");
            return (
              <div
                key={employment.id}
                className="grid min-w-0 gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {employment.company.displayName}
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {employment.state === "unknown"
                        ? "Unconfirmed"
                        : employment.state}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employment.title ?? "Title not provided"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {employment.experienceType ? (
                      <Badge variant="secondary">
                        {
                          CAREER.EMPLOYMENT_EXPERIENCE_LABELS[
                            employment.experienceType
                          ]
                        }
                      </Badge>
                    ) : null}
                    {employment.city ? (
                      <Badge variant="outline" className="gap-1.5">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {employment.city.label}
                      </Badge>
                    ) : null}
                    {!employment.guildVisible ? (
                      <Badge variant="outline">Hidden on Guild</Badge>
                    ) : null}
                    {employment.company.reviewState !== "approved" ? (
                      <Badge variant="outline" className="capitalize">
                        Company {employment.company.reviewState}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground sm:text-right">
                  {dates || "Dates not confirmed"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </DetailSection>
  );
}

function MemberRoles({ detail }: { detail: AdminMemberDetail }) {
  return (
    <DetailSection
      title="Roles"
      icon={ShieldCheck}
      description="Discord-backed Blade roles linked to this account."
    >
      {detail.roles.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No linked roles are recorded.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 p-3 sm:p-4">
          {detail.roles.map((role) => (
            <Badge
              key={role.name}
              variant="outline"
              className="gap-2 border-white/10"
              style={role.color ? { borderColor: role.color } : undefined}
            >
              <span
                className="size-2 rounded-full bg-primary"
                style={role.color ? { backgroundColor: role.color } : undefined}
                aria-hidden="true"
              />
              {role.name}
            </Badge>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function fileToDataUrl(file: File, failureMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(failureMessage));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(failureMessage));
    };
    reader.readAsDataURL(file);
  });
}

function AdminMemberFiles({
  canEdit,
  detail,
  onChanged,
}: {
  canEdit: boolean;
  detail: AdminMemberDetail;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const accessResume = api.memberAdmin.accessAdminMemberResume.useMutation();
  const uploadPicture = api.memberAdmin.uploadAdminProfilePicture.useMutation();
  const removePicture = api.memberAdmin.removeAdminProfilePicture.useMutation();
  const uploadResume = api.memberAdmin.uploadAdminResume.useMutation();
  const removeResume = api.memberAdmin.removeAdminResume.useMutation();
  const isPending =
    accessResume.isPending ||
    uploadPicture.isPending ||
    removePicture.isPending ||
    uploadResume.isPending ||
    removeResume.isPending;

  const run = async (operation: () => Promise<unknown>, message: string) => {
    setError(null);
    try {
      await operation();
      toast.success(message);
      onChanged();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Member file could not be changed.",
      );
    }
  };

  const viewResume = async () => {
    setError(null);
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    try {
      const result = await accessResume.mutateAsync({
        memberId: detail.member.id,
      });
      if (!result.url) {
        throw new Error("This member no longer has a resume.");
      }
      if (previewWindow) {
        previewWindow.location.replace(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (operationError) {
      previewWindow?.close();
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Resume could not be opened.",
      );
    }
  };

  return (
    <DetailSection
      title="Profile files"
      icon={FileText}
      description={
        canEdit
          ? "On-demand secure previews and target-owned replacements."
          : "Secure previews are requested on demand and expire automatically."
      }
    >
      <div className="min-w-0 divide-y divide-border/70 md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <Avatar className="h-14 w-14 shrink-0 border border-white/10">
            {detail.profilePictureUrl && (
              <AvatarImage
                src={detail.profilePictureUrl}
                alt={`${detail.member.firstName} ${detail.member.lastName} profile picture`}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/15 text-xl text-primary">
              {detail.member.firstName[0]}
              {detail.member.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <div>
              <h4 className="text-sm font-medium">Profile picture</h4>
              <p className="text-sm text-muted-foreground">
                {detail.member.profilePictureUrl ? "Available" : "Not uploaded"}
              </p>
            </div>
            {canEdit && (
              <div className="flex min-w-0 flex-wrap gap-2">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-9">
                  <UploadCloud className="h-4 w-4" />
                  {detail.member.profilePictureUrl ? "Replace" : "Upload"}
                  <Input
                    type="file"
                    // Named explicitly: the wrapping label reads "Upload" or
                    // "Replace" depending on state, which tells a screen reader
                    // nothing about what is being uploaded and changes out from
                    // under anyone targeting it.
                    aria-label="Upload profile picture"
                    accept={uploadAccept(PROFILE_PICTURE_UPLOAD_POLICY)}
                    className="sr-only"
                    disabled={isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const check = checkUploadMetadata(
                        PROFILE_PICTURE_UPLOAD_POLICY,
                        {
                          contentType: file.type,
                          fileName: file.name,
                          size: file.size,
                        },
                      );
                      if (!check.ok) {
                        setError(check.message);
                        return;
                      }
                      void run(async () => {
                        const fileContent = await fileToDataUrl(
                          file,
                          "Profile picture could not be read.",
                        );
                        return uploadPicture.mutateAsync({
                          fileContent,
                          fileName: file.name,
                          memberId: detail.member.id,
                        });
                      }, "Profile picture saved.");
                    }}
                  />
                </label>
                {detail.member.profilePictureUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Remove profile picture"
                    disabled={isPending}
                    onClick={() =>
                      void run(
                        () =>
                          removePicture.mutateAsync({
                            memberId: detail.member.id,
                          }),
                        "Profile picture removed.",
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <h4 className="text-sm font-medium">Resume</h4>
              <p className="text-sm text-muted-foreground">
                {detail.member.resumeUrl ? "Available" : "Not uploaded"}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {detail.member.resumeUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => void viewResume()}
                >
                  {accessResume.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {accessResume.isPending ? "Opening…" : "View resume"}
                </Button>
              )}
              {canEdit && (
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-9">
                  <UploadCloud className="h-4 w-4" />
                  {detail.member.resumeUrl ? "Replace" : "Upload"}
                  <Input
                    type="file"
                    accept={uploadAccept(RESUME_UPLOAD_POLICY)}
                    className="sr-only"
                    disabled={isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const check = checkUploadMetadata(RESUME_UPLOAD_POLICY, {
                        contentType: file.type,
                        fileName: file.name,
                        size: file.size,
                      });
                      if (!check.ok) {
                        setError(check.message);
                        return;
                      }
                      void run(async () => {
                        const fileContent = await fileToDataUrl(
                          file,
                          "Resume could not be read.",
                        );
                        return uploadResume.mutateAsync({
                          fileContent,
                          fileName: file.name,
                          memberId: detail.member.id,
                        });
                      }, "Resume saved.");
                    }}
                  />
                </label>
              )}
              {canEdit && detail.member.resumeUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remove resume"
                  disabled={isPending}
                  onClick={() =>
                    void run(
                      () =>
                        removeResume.mutateAsync({
                          memberId: detail.member.id,
                        }),
                      "Resume removed.",
                    )
                  }
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {error && (
        <p className="border-t border-border/70 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </DetailSection>
  );
}

function AdminMemberEditForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: AdminMemberDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const defaults = useMemo(() => {
    const {
      profilePictureUrl: _picture,
      resumeUrl: _resume,
      ...profile
    } = memberProfileFormDefaults(detail.member);
    return profile;
  }, [detail.member]);
  const [points, setPoints] = useState(detail.member.points);
  const form = useForm<AdminMemberEditableProfileValues>({
    schema: adminMemberEditableProfileSchema,
    defaultValues: defaults,
  });
  const update = api.memberAdmin.updateAdminMember.useMutation({
    onSuccess() {
      toast.success("Member profile saved.");
      onSaved();
    },
    onError(error) {
      toast.error(error.message || "Member profile could not be saved.");
    },
  });

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((profile) =>
          update.mutate({ memberId: detail.member.id, points, profile }),
        )}
      >
        {sectionOrder.map((section) => (
          <section
            key={section}
            className="space-y-4 rounded-md border border-white/10 bg-background/60 p-4"
          >
            <h3 className="font-semibold">{sectionTitles[section]}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {memberSettingsFields
                .filter((field) => field.section === section)
                .map((fieldConfig) => (
                  <FormField
                    key={fieldConfig.name}
                    control={form.control}
                    name={
                      fieldConfig.name as keyof AdminMemberEditableProfileValues
                    }
                    render={({ field }) => (
                      <FormItem
                        className={cn(
                          fieldConfig.kind === "textarea" && "md:col-span-2",
                        )}
                      >
                        <FormLabel>{fieldConfig.label}</FormLabel>
                        <FormControl>
                          <MemberSettingsFieldControl
                            fieldConfig={fieldConfig}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              {section === "Personal" && (
                <div className="space-y-2">
                  <label
                    htmlFor="admin-member-points"
                    className="text-sm font-medium"
                  >
                    Points
                  </label>
                  <Input
                    id="admin-member-points"
                    type="number"
                    min={0}
                    className="h-11 bg-background/70"
                    value={points}
                    onChange={(event) => setPoints(Number(event.target.value))}
                  />
                </div>
              )}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border/70 bg-card/95 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save member
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeleteMemberDialog({
  detail,
  onDeleted,
}: {
  detail: AdminMemberDetail;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const remove = api.memberAdmin.deleteAdminMember.useMutation({
    onSuccess() {
      toast.success("Member profile deleted.");
      setOpen(false);
      setConfirmation("");
      onDeleted();
    },
    onError(error) {
      toast.error(error.message || "Member profile could not be deleted.");
    },
  });

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete member
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-destructive/30 bg-card/95 motion-reduce:animate-none">
          <DialogHeader>
            <DialogTitle>Delete this Member profile?</DialogTitle>
            <DialogDescription>
              This removes membership data, dues, the signup response, and
              member-owned files. The Blade account, roles, sessions, and Hacker
              data remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="delete-member-confirmation"
              className="text-sm font-medium"
            >
              Type{" "}
              <span className="font-mono">
                {ADMIN_MEMBER_DELETE_CONFIRMATION}
              </span>
            </label>
            <Input
              id="delete-member-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                confirmation !== ADMIN_MEMBER_DELETE_CONFIRMATION ||
                remove.isPending
              }
              onClick={() =>
                remove.mutate({
                  confirmation: ADMIN_MEMBER_DELETE_CONFIRMATION,
                  memberId: detail.member.id,
                })
              }
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Member profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberDetailDialog({
  canEdit,
  detail,
  onClose,
  onChanged,
  onDeleted,
}: {
  canEdit: boolean;
  detail: AdminMemberDetail;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const dues = api.memberAdmin.setAdminDuesStatus.useMutation({
    onSuccess() {
      toast.success("Dues status updated.");
      onChanged();
    },
    onError(error) {
      toast.error(error.message || "Dues status could not be updated.");
    },
  });
  const member = detail.member;
  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[60] h-[100svh] max-h-[100svh] w-screen max-w-none gap-0 overflow-y-auto overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-2xl motion-reduce:animate-none sm:h-auto sm:max-h-[92svh] sm:w-[calc(100svw-1rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:border-white/10 [&_button]:min-h-11 sm:[&_button]:min-h-9">
        <DialogHeader
          data-testid="member-detail-header"
          className="border-b border-border/70 px-4 py-3 pr-14 text-left sm:px-6 sm:py-5"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Avatar className="h-14 w-14 shrink-0 border border-white/10 shadow-lg sm:h-20 sm:w-20">
                {detail.profilePictureUrl && (
                  <AvatarImage
                    src={detail.profilePictureUrl}
                    alt={`${fullName} profile picture`}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-primary/15 text-lg text-primary sm:text-2xl">
                  {member.firstName[0]}
                  {member.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1 sm:space-y-2">
                <DialogTitle className="truncate text-xl sm:text-2xl">
                  {fullName}
                </DialogTitle>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                  <DialogDescription className="min-w-0 truncate text-xs sm:text-sm">
                    @{member.discordUser}
                  </DialogDescription>
                  <Badge
                    variant={detail.duesStatus.paid ? "default" : "secondary"}
                    className="shrink-0 text-[11px] sm:text-xs"
                  >
                    {detail.duesStatus.paid ? "Paid" : "Unpaid"}
                  </Badge>
                  {member.alumniConfirmedAt && <AlumniBadge />}
                </div>
              </div>
            </div>
            {canEdit && !editing && (
              <Button
                type="button"
                data-member-edit-placement="dialog-header"
                className="w-full sm:ml-auto sm:w-auto sm:shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit member
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5 md:px-6">
          {editing ? (
            <AdminMemberEditForm
              detail={detail}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                onChanged();
              }}
            />
          ) : (
            <div
              data-member-detail-layout="sectioned"
              className="min-w-0 space-y-4 sm:space-y-5"
            >
              <MemberOverviewMetrics detail={detail} />
              <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
                <div className="contents lg:order-2 lg:block lg:min-w-0 lg:space-y-5">
                  <div className="order-1 min-w-0">
                    <DiscordEngagement detail={detail} />
                  </div>

                  <div className="order-2 min-w-0 space-y-4 sm:space-y-5">
                    <DetailSection title="Contact & identity" icon={UserRound}>
                      <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                        <DetailValue label="Email" value={member.email} />
                        <DetailValue
                          label="Phone"
                          value={display(member.phoneNumber)}
                        />
                        <DetailValue
                          label="Date of birth"
                          value={formatDate(member.dob)}
                        />
                        <DetailValue label="Age" value={member.age} />
                        <DetailValue
                          label="Shirt size"
                          value={member.shirtSize}
                        />
                        <DetailValue label="Gender" value={member.gender} />
                        <DetailValue
                          label="Race or ethnicity"
                          value={member.raceOrEthnicity}
                          wide
                        />
                      </dl>
                    </DetailSection>

                    <DetailSection
                      title="Academics & work"
                      icon={GraduationCap}
                    >
                      <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                        <DetailValue
                          label="School"
                          value={member.school}
                          wide
                        />
                        <DetailValue label="Major" value={member.major} />
                        <DetailValue
                          label="Level of study"
                          value={member.levelOfStudy}
                        />
                        <DetailValue
                          label="Graduation date"
                          value={
                            detail.graduated ? (
                              <span className={graduatedDateClassName}>
                                {formatDate(member.gradDate)}
                              </span>
                            ) : (
                              formatDate(member.gradDate)
                            )
                          }
                        />
                        <DetailValue
                          label="Legacy company"
                          value={display(member.company)}
                        />
                      </dl>
                    </DetailSection>

                    <DetailSection title="Guild profile" icon={ShieldCheck}>
                      <dl className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-4">
                        <DetailValue
                          label="Profile visibility"
                          value={
                            member.guildProfileVisible ? "Public" : "Private"
                          }
                        />
                        <DetailValue label="Points" value={member.points} />
                        <DetailValue
                          label="Resume visibility"
                          value={
                            member.guildResumeVisible ? "Public" : "Private"
                          }
                        />
                        <DetailValue
                          label="Location"
                          value={detail.guildLocation?.label ?? "Not provided"}
                        />
                        <DetailValue
                          label="Location visibility"
                          value={
                            member.guildLocationVisible ? "Public" : "Private"
                          }
                        />
                        <DetailValue
                          label="Alumni status"
                          value={
                            member.alumniConfirmedAt
                              ? `Confirmed ${formatTimestamp(member.alumniConfirmedAt)}`
                              : "Not confirmed"
                          }
                        />
                        <DetailValue
                          label="Tagline"
                          value={display(member.tagline)}
                          wide
                        />
                        <DetailValue
                          label="About"
                          value={display(member.about)}
                          wide
                        />
                        <DetailValue
                          label="Opportunity interests"
                          value={
                            member.guildOpportunityStatuses.length > 0 ? (
                              <span className="flex flex-wrap gap-2">
                                {member.guildOpportunityStatuses.map(
                                  (status) => (
                                    <Badge key={status} variant="secondary">
                                      {
                                        GUILD.GUILD_OPPORTUNITY_STATUS_LABELS[
                                          status
                                        ]
                                      }
                                    </Badge>
                                  ),
                                )}
                              </span>
                            ) : (
                              "None selected"
                            )
                          }
                          wide
                        />
                        <DetailValue
                          label="GitHub"
                          value={<ProfileLink href={member.githubProfileUrl} />}
                          wide
                        />
                        <DetailValue
                          label="LinkedIn"
                          value={
                            <ProfileLink href={member.linkedinProfileUrl} />
                          }
                          wide
                        />
                        <DetailValue
                          label="Website"
                          value={<ProfileLink href={member.websiteUrl} />}
                          wide
                        />
                      </dl>
                    </DetailSection>
                  </div>
                </div>

                <aside className="contents lg:order-1 lg:block lg:min-w-0 lg:space-y-5">
                  <div className="order-1 min-w-0">
                    <EventEngagement detail={detail} />
                  </div>

                  <div className="order-1 min-w-0">
                    <DetailSection title="Membership & dues" icon={CreditCard}>
                      <div className="min-w-0 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Current status
                            </p>
                            <p className="mt-1 text-sm leading-5">
                              {detail.duesStatus.paid
                                ? `Paid for ${detail.duesStatus.paymentAcademicYear.shortLabel}`
                                : `Unpaid for ${detail.duesStatus.payableAcademicYear.shortLabel}`}
                            </p>
                          </div>
                          <Badge
                            variant={
                              detail.duesStatus.paid ? "default" : "secondary"
                            }
                            className="shrink-0"
                          >
                            {detail.duesStatus.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>

                        <dl className="mt-3 divide-y divide-border/70 border-y border-border/70 text-sm">
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">
                              Academic year
                            </dt>
                            <dd className="text-right font-medium">
                              {detail.duesStatus.paid
                                ? detail.duesStatus.paymentAcademicYear
                                    .shortLabel
                                : detail.duesStatus.payableAcademicYear
                                    .shortLabel}
                            </dd>
                          </div>
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">Paid date</dt>
                            <dd className="text-right font-medium">
                              {formatTimestamp(
                                detail.duesStatus.paidAt,
                                "Not paid",
                              )}
                            </dd>
                          </div>
                          <div className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                            <dt className="text-muted-foreground">Amount</dt>
                            <dd className="text-right font-medium">
                              {detail.duesStatus.amountPaid == null
                                ? detail.duesStatus.amountDueLabel
                                : formatDuesAmount(
                                    detail.duesStatus.amountPaid,
                                  )}
                            </dd>
                          </div>
                        </dl>

                        {canEdit && (
                          <Button
                            type="button"
                            className="mt-3 w-full"
                            variant={
                              detail.duesStatus.paid ? "outline" : "secondary"
                            }
                            disabled={dues.isPending}
                            onClick={() =>
                              dues.mutate({
                                memberId: member.id,
                                paid: !detail.duesStatus.paid,
                              })
                            }
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {detail.duesStatus.paid
                              ? "Revoke dues"
                              : "Grant dues"}
                          </Button>
                        )}
                      </div>
                      {detail.duesHistory.length > 0 ? (
                        <div className="border-t border-border/70 px-3 py-3 sm:px-4">
                          <p className="text-sm font-semibold">
                            Payment history
                          </p>
                          <div className="mt-2 max-h-52 divide-y divide-border/70 overflow-y-auto border-y border-border/70">
                            {detail.duesHistory.map((payment) => (
                              <div
                                key={`${payment.year}-${payment.paidAt.toISOString()}`}
                                className="py-2.5 text-sm"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium">
                                    Stored year {payment.year}
                                  </span>
                                  <Badge
                                    variant={
                                      payment.active ? "default" : "outline"
                                    }
                                  >
                                    {payment.active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-muted-foreground">
                                  {formatTimestamp(payment.paidAt)} ·{" "}
                                  {formatDuesAmount(payment.amount)} ·{" "}
                                  {payment.source}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </DetailSection>
                  </div>

                  <div className="order-3 min-w-0">
                    <EmploymentHistory detail={detail} />
                  </div>

                  <div className="order-3 min-w-0">
                    <MemberRoles detail={detail} />
                  </div>

                  <div className="order-3 min-w-0">
                    <AdminMemberFiles
                      canEdit={canEdit}
                      detail={detail}
                      onChanged={onChanged}
                    />
                  </div>

                  <div className="order-3 min-w-0">
                    <DetailSection title="Record details" icon={IdCard}>
                      <dl className="grid min-w-0 gap-3 p-3 sm:gap-y-4 sm:p-4">
                        <DetailValue
                          label="Joined"
                          value={formatJoined(
                            member.dateCreated,
                            member.timeCreated,
                          )}
                        />
                        <DetailValue
                          label="First event"
                          value={
                            detail.events.length > 0
                              ? formatTimestamp(
                                  detail.events.at(-1)?.startAt ?? null,
                                )
                              : "No recorded attendance"
                          }
                        />
                        <DetailValue
                          label="First Discord message"
                          value={formatTimestamp(
                            detail.discord.firstMessageAt,
                            "No archived messages",
                          )}
                        />
                      </dl>
                      {canEdit && (
                        <div className="flex justify-stretch border-t border-border/70 p-3 sm:justify-end sm:p-4">
                          <DeleteMemberDialog
                            detail={detail}
                            onDeleted={onDeleted}
                          />
                        </div>
                      )}
                    </DetailSection>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
