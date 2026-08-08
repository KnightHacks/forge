"use client";

import { useState } from "react";
import {
  Ban,
  ExternalLink,
  GraduationCap,
  Loader2,
  MailWarning,
  MessageSquareText,
  Pencil,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  Utensils,
} from "lucide-react";

import { FORMS } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Skeleton } from "@forge/ui/skeleton";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import {
  DetailRow,
  DetailSection,
  SummaryMetric,
} from "~/app/_components/admin/shared/detail-panel";
import { DiscordActivityTracker } from "~/app/_components/admin/shared/discord-activity-tracker";
import { DiscordEngagementMetrics } from "~/app/_components/admin/shared/discord-engagement-metrics";
import { api } from "~/trpc/react";
import {
  firstTimeStatusLabel,
  resolveFirstTimeStatus,
} from "./first-time-status";
import { HackerEventAttendancePanel } from "./hacker-event-attendance-panel";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

/** Only what the edit form reads, so it does not depend on the whole DTO. */
interface HackerEditable {
  country: string;
  dob: string;
  discordUser: string;
  email: string;
  firstName: string;
  foodAllergies: string | null;
  gender: string;
  githubProfileUrl: string | null;
  gradDate: string;
  lastName: string;
  levelOfStudy: string;
  linkedinProfileUrl: string | null;
  major: string;
  phoneNumber: string;
  raceOrEthnicity: string;
  resumeUrl: string | null;
  school: string;
  shirtSize: string;
  websiteUrl: string | null;
}

/** `checkedin` is filterable but not settable, so it has no label entry. */
function statusLabel(status: string) {
  // `hasOwn`, not `in`, which walks the prototype and would return a function
  // for a wire value like `"toString"` — React throws on that, so an officer
  // would get an error boundary instead of this fallback.
  return Object.hasOwn(HACKER_STATUS_LABELS, status)
    ? HACKER_STATUS_LABELS[status as SendingStatus]
    : "Checked in";
}

function HackerDetailSkeleton() {
  return (
    <div aria-label="Applicant details loading" aria-busy="true">
      <DialogHeader className="border-b border-border/70 bg-background/40 px-4 py-4 sm:px-6">
        <DialogTitle className="sr-only">Applicant</DialogTitle>
        <DialogDescription className="sr-only">
          Loading applicant details.
        </DialogDescription>
        <div className="flex items-start gap-3" aria-hidden="true">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </DialogHeader>
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, section) => (
          <section
            className="overflow-hidden rounded-md border border-white/10 bg-background/60"
            key={section}
          >
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="grid gap-3 p-4">
              {Array.from({ length: section === 0 ? 5 : 3 }).map((_, row) => (
                <div
                  className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3"
                  key={row}
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * One applicant in full, and everything an officer can do to them.
 *
 * A hacker record is a superset of a member's, so this reads like the member
 * detail panel with the extra fields MLH requires and the hackathon-specific
 * state layered on. Row actions live here rather than in the table for the same
 * reason the member directory does it: five controls per line competing with
 * the data makes the table unscannable, and destructive actions need room to
 * explain themselves.
 */
export function HackerDetailDialog({
  attendeeId,
  blocked,
  blockedReason,
  hackathonId,
  onOpenChange,
  onSaved,
}: {
  attendeeId: string | null;
  blocked: boolean;
  blockedReason: string | null;
  hackathonId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [blacklisting, setBlacklisting] = useState(false);
  const [pointDelta, setPointDelta] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Re-seeded per applicant, so one person's reason cannot follow another.
  if (attendeeId && seededFor !== attendeeId) {
    setSeededFor(attendeeId);
    setReason("");
    setEditing(false);
    setPointDelta("");
    setPointReason("");
    setAwarding(false);
    setBlacklisting(false);
  }
  if (!attendeeId && seededFor !== null) setSeededFor(null);

  const detail = api.hacker.get.useQuery(
    { attendeeId: attendeeId ?? "" },
    { enabled: attendeeId !== null },
  );
  const hacker = detail.data;
  const firstTimeStatus = hacker
    ? resolveFirstTimeStatus(
        hacker as typeof hacker & {
          firstTimeStatus?: "first" | "returning" | "unknown" | null;
        },
      )
    : "unknown";

  const setStatus = api.hacker.setStatus.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(
        result.withheldCount
          ? "Status updated. No email sent — this environment only sends to the team."
          : "Status updated. The email is queued.",
      );
      onSaved();
    },
  });
  const setBlacklist = api.hacker.setBlacklist.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(
        result.blacklisted ? "Applicant blacklisted." : "Blacklist removed.",
      );
      onSaved();
    },
  });

  const awardPoints = api.hacker.awardPoints.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(`Points updated. Now ${result.points}.`);
      setPointDelta("");
      setPointReason("");
      setAwarding(false);
      onSaved();
    },
  });
  const updateProfile = api.hacker.updateProfile.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(
        result.updated ? "Application updated." : "Nothing changed.",
      );
      setEditing(false);
      onSaved();
    },
  });

  const busy =
    setStatus.isPending ||
    setBlacklist.isPending ||
    awardPoints.isPending ||
    updateProfile.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={attendeeId !== null}>
      <DialogContent className="z-[60] h-[100svh] max-h-[100svh] w-screen max-w-none gap-0 overflow-y-auto overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-2xl motion-reduce:animate-none sm:h-auto sm:max-h-[92svh] sm:w-[calc(100svw-1rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:border-white/10">
        {detail.isError ? (
          <DialogHeader className="px-4 py-4 sm:px-6">
            <DialogTitle>Could not load applicant</DialogTitle>
            <DialogDescription>{detail.error.message}</DialogDescription>
          </DialogHeader>
        ) : null}

        {detail.isPending ? <HackerDetailSkeleton /> : null}

        {detail.isError ? (
          <Button
            className="mx-4 mb-4 min-h-11 justify-self-start sm:mx-6 sm:mb-6"
            onClick={() => void detail.refetch()}
            variant="secondary"
          >
            Try again
          </Button>
        ) : null}

        {hacker ? (
          <>
            <DialogHeader className="border-b border-border/70 bg-background/40 px-4 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                {/* Initials avatar, the same anchor the member panel opens with. */}
                <div
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-lg font-semibold text-primary"
                >
                  {`${hacker.firstName.at(0) ?? ""}${hacker.lastName.at(0) ?? ""}`.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="flex flex-wrap items-center gap-2 break-words leading-tight">
                    {hacker.name}
                    <Badge className="text-sm" variant="secondary">
                      {statusLabel(hacker.status)}
                    </Badge>
                    {firstTimeStatus === "first" ? (
                      <Badge className="gap-1 text-sm" variant="outline">
                        <Sparkles className="size-3" aria-hidden="true" />
                        First-time hacker
                      </Badge>
                    ) : null}
                    {hacker.blacklisted ? (
                      <Badge className="gap-1 text-sm" variant="destructive">
                        <Ban className="size-3" aria-hidden="true" />{" "}
                        Blacklisted
                      </Badge>
                    ) : null}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 break-all">
                    <span>
                      Applied{" "}
                      {new Date(hacker.timeApplied).toLocaleDateString()}
                      {hacker.timeConfirmed
                        ? ` · confirmed ${new Date(hacker.timeConfirmed).toLocaleDateString()}`
                        : ""}
                    </span>
                  </DialogDescription>
                </div>
                {/* A real control, not a ghost link buried in the subtitle. */}
                <Button
                  className="min-h-11 shrink-0 gap-2"
                  disabled={busy || blocked}
                  onClick={() => setEditing((current) => !current)}
                  variant={editing ? "secondary" : "outline"}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  {editing ? "Stop editing" : "Edit"}
                </Button>
              </div>

              {/* The summary row the member panel leads with: the numbers an
                  organiser scans before reading anything. */}
              <section
                aria-label="Applicant summary"
                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                <SummaryMetric label="Points" value={hacker.points} />
                {/* Derived from the date of birth on every read, because the
                    stored age is captured once at application time and never
                    ages up. */}
                <SummaryMetric label="Age" value={hacker.age} />
                <SummaryMetric
                  label="Discord messages"
                  value={hacker.discord?.messageCount ?? 0}
                />
                <SummaryMetric
                  label="Status"
                  value={
                    <span className="font-sans text-sm font-medium">
                      {statusLabel(hacker.status)}
                    </span>
                  }
                />
              </section>
            </DialogHeader>

            {hacker.age < 18 ? (
              <div className="mx-4 mb-4 rounded-lg border-2 border-amber-500 bg-amber-500/20 p-5 sm:mx-6">
                <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
                  Under 18 — {hacker.age} years old
                </p>
                <p className="mt-2 text-sm text-foreground/80">
                  MLH requires a signed parental consent form before this
                  applicant can attend, and they cannot be left unsupervised.
                  Check this before accepting.
                </p>
              </div>
            ) : null}

            {hacker.foodAllergies?.trim() ? (
              <div className="mx-4 mb-4 rounded-lg border border-primary/40 bg-primary/10 p-4 sm:mx-6">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <Utensils className="size-4 shrink-0" aria-hidden="true" />
                  Dietary needs
                </p>
                {/* Verbatim: an allergy paraphrased is an allergy missed. */}
                <p className="mt-1.5 text-base leading-relaxed text-foreground">
                  {hacker.foodAllergies}
                </p>
              </div>
            ) : null}

            {hacker.deliveryFailed ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <MailWarning className="size-4" aria-hidden="true" />
                  Their last email never arrived
                </p>
                <p className="mt-1 text-sm text-destructive/90">
                  {hacker.sendError ?? "Delivery failed."} Reach them another
                  way — contact details below.
                </p>
              </div>
            ) : null}

            {hacker.blacklisted ? (
              <div className="mx-4 mb-4 rounded-lg border-2 border-destructive/70 bg-destructive/20 p-5 sm:mx-6">
                <p className="flex items-center gap-2 text-base font-semibold text-destructive-foreground">
                  <Ban className="size-5 shrink-0" aria-hidden="true" />
                  Blacklisted
                </p>
                {/* The reason is the whole point of the banner — a year from now
                    it is the only thing that explains the flag — so it reads as
                    the message rather than a footnote under it. */}
                <blockquote className="mt-3 border-l-4 border-destructive/70 bg-background/30 py-2 pl-4 text-base font-medium leading-relaxed text-destructive-foreground">
                  {hacker.blacklistReason}
                </blockquote>
                <p className="mt-3 text-sm text-destructive-foreground/80">
                  They cannot be accepted. Capacity reject still works — that is
                  how they leave the funnel. They are never told about this.
                </p>
              </div>
            ) : null}

            {/*
              An officer retypes a phone number off a badge and fixes a typo'd
              email that bounced. Without this the only remedy was asking the
              applicant to reapply. Scoped to what actually gets corrected —
              school, major and the MLH consent answers are the applicant's own
              answers, not an officer's to rewrite.
            */}
            {editing ? (
              <div className="px-4 py-4 sm:px-6">
                <HackerEditForm
                  busy={busy}
                  hacker={hacker}
                  onCancel={() => setEditing(false)}
                  onSave={(patch) =>
                    updateProfile.mutate({
                      attendeeId: hacker.attendeeId,
                      ...patch,
                    })
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 px-4 pb-4 pt-4 sm:px-6 lg:grid-cols-2">
                {/*
                First, under the summary. These are the only irreversible things
                on the screen and the reason an officer opened it — reading the
                application is what they do to decide, not the task itself.
              */}
                <DetailSection
                  className="lg:col-span-2"
                  description={
                    blocked
                      ? (blockedReason ?? "Actions are unavailable.")
                      : "Each status sends its configured email immediately. It cannot be recalled."
                  }
                  icon={Send}
                  title="Status and actions"
                >
                  <div className="flex flex-wrap gap-2 px-3 py-3 sm:px-4">
                    {(Object.keys(HACKER_STATUS_LABELS) as SendingStatus[]).map(
                      (status) => (
                        <Button
                          className="min-h-11 text-sm"
                          disabled={
                            busy ||
                            blocked ||
                            hacker.status === status ||
                            // Blacklisted: capacity reject only.
                            (hacker.blacklisted && status !== "denied")
                          }
                          key={status}
                          onClick={() =>
                            setStatus.mutate({
                              attendeeId: hacker.attendeeId,
                              status,
                            })
                          }
                          size="sm"
                          variant={
                            status === "accepted" ? "primary" : "secondary"
                          }
                        >
                          {HACKER_STATUS_LABELS[status]}
                        </Button>
                      ),
                    )}
                  </div>
                  <div className="border-t border-border/70 px-3 py-3 sm:px-4">
                    {hacker.blacklisted ? (
                      <Button
                        className="min-h-11 gap-2"
                        disabled={busy || blocked}
                        onClick={() =>
                          setBlacklist.mutate({
                            attendeeId: hacker.attendeeId,
                            blacklisted: false,
                          })
                        }
                        variant="secondary"
                      >
                        {setBlacklist.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : null}
                        Remove blacklist
                      </Button>
                    ) : blacklisting ? (
                      <div className="grid gap-2">
                        <Label htmlFor="detail-blacklist-reason">
                          Why should this applicant not be accepted?
                        </Label>
                        <Textarea
                          id="detail-blacklist-reason"
                          maxLength={500}
                          onChange={(event) => setReason(event.target.value)}
                          value={reason}
                        />
                        <p className="text-sm text-muted-foreground">
                          Does not change their status and sends nothing.
                          Visible only here — a year from now it is the only
                          thing that explains the flag.
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            className="min-h-11"
                            disabled={busy}
                            onClick={() => setBlacklisting(false)}
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="min-h-11 gap-2"
                            disabled={busy || blocked || reason.trim() === ""}
                            onClick={() =>
                              setBlacklist.mutate({
                                attendeeId: hacker.attendeeId,
                                blacklisted: true,
                                reason,
                              })
                            }
                            variant="destructive"
                          >
                            Blacklist applicant
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="min-h-11 gap-2"
                        disabled={busy || blocked}
                        onClick={() => setBlacklisting(true)}
                        variant="outline"
                      >
                        <Ban className="size-4" aria-hidden="true" />
                        Blacklist applicant
                      </Button>
                    )}
                  </div>
                </DetailSection>

                <DetailSection
                  description="Who they are, and how to reach them."
                  icon={UserRound}
                  title="Personal info"
                >
                  <DetailRow label="Email" value={hacker.email} />
                  <DetailRow label="Phone" value={hacker.phoneNumber} />
                  <DetailRow label="Country" value={hacker.country} />
                  {/* Derived from the date of birth on every read. The declared
                      figure sits beside it, since that is what they attested
                      to and it is what MLH paperwork quotes. */}
                  <DetailRow
                    label="Age"
                    value={`${hacker.age} (declared ${hacker.ageAtApplication})`}
                  />
                  <DetailRow
                    label="Date of birth"
                    value={new Date(hacker.dob).toLocaleDateString(undefined, {
                      timeZone: "UTC",
                    })}
                  />
                  <DetailRow label="Gender" value={hacker.gender} />
                  <DetailRow
                    label="Race / ethnicity"
                    value={hacker.raceOrEthnicity}
                  />
                  <DetailRow
                    label="Dietary"
                    value={hacker.foodAllergies ?? "Not given"}
                  />
                </DetailSection>

                <DetailSection
                  description="Their own answers on the application."
                  icon={GraduationCap}
                  title="Study"
                >
                  <DetailRow label="School" value={hacker.school} />
                  <DetailRow label="Level" value={hacker.levelOfStudy} />
                  <DetailRow label="Major" value={hacker.major} />
                  <DetailRow
                    label="Graduates"
                    value={new Date(hacker.gradDate).toLocaleDateString(
                      undefined,
                      { month: "long", timeZone: "UTC", year: "numeric" },
                    )}
                  />
                  <DetailRow label="Shirt" value={hacker.shirtSize} />
                  <DetailRow
                    label="First hackathon"
                    value={firstTimeStatusLabel(firstTimeStatus)}
                  />
                </DetailSection>

                <DetailSection
                  description="Awarded by hand. Every change is logged under the officer who made it."
                  icon={Sparkles}
                  title="Points"
                >
                  <DetailRow label="Total" value={hacker.points} />
                  <div className="px-3 py-3 sm:px-4">
                    {/*
                    Behind a control rather than always on screen: this panel is
                    read far more often than it is used to award, and a live
                    number box in a permanent row invites a mis-click on a value
                    an officer never meant to change.
                  */}
                    {awarding ? (
                      <div className="grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                          <Input
                            aria-label="Points to add or subtract"
                            className="h-11"
                            disabled={busy || blocked}
                            inputMode="numeric"
                            onChange={(event) =>
                              setPointDelta(event.target.value)
                            }
                            placeholder="+10"
                            type="number"
                            value={pointDelta}
                          />
                          <Input
                            aria-label="Reason for the adjustment"
                            className="h-11"
                            disabled={busy || blocked}
                            maxLength={300}
                            onChange={(event) =>
                              setPointReason(event.target.value)
                            }
                            placeholder="Why? e.g. won the hardware challenge"
                            value={pointReason}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          A change, not a new total, so two officers awarding at
                          once add up.
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            className="min-h-11"
                            disabled={busy}
                            onClick={() => setAwarding(false)}
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="min-h-11"
                            disabled={
                              busy ||
                              blocked ||
                              pointDelta.trim() === "" ||
                              Number(pointDelta) === 0 ||
                              pointReason.trim() === ""
                            }
                            onClick={() =>
                              awardPoints.mutate({
                                attendeeId: hacker.attendeeId,
                                delta: Number(pointDelta),
                                reason: pointReason,
                              })
                            }
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="min-h-11"
                        disabled={busy || blocked}
                        onClick={() => setAwarding(true)}
                        variant="secondary"
                      >
                        Adjust points
                      </Button>
                    )}
                  </div>
                </DetailSection>

                <DetailSection
                  description="The handle they typed, and the account Blade linked."
                  icon={MessageSquareText}
                  title="Discord"
                >
                  <DetailRow label="Handle" value={`@${hacker.discordUser}`} />
                  <DetailRow
                    label="Account"
                    value={hacker.discordUserId ?? "Not linked"}
                  />
                  {hacker.discordUserId ? (
                    <DetailRow
                      label="Open"
                      value={
                        <a
                          className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline"
                          href={`https://discord.com/users/${hacker.discordUserId}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Message on Discord
                          <ExternalLink
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      }
                    />
                  ) : null}
                </DetailSection>

                {hacker.discord ? (
                  <DetailSection
                    description="Human-authored, non-deleted messages matched through their linked Discord account."
                    icon={MessageSquareText}
                    title="Discord engagement"
                  >
                    <DiscordEngagementMetrics
                      activeChannelCount={hacker.discord.activeChannelCount}
                      activeDayCount={hacker.discord.activeDayCount}
                      currentStreakDays={hacker.discord.currentStreakDays}
                      lastMessage={
                        hacker.discord.lastMessageAt
                          ? new Date(
                              hacker.discord.lastMessageAt,
                            ).toLocaleDateString()
                          : "None"
                      }
                      longestStreakDays={hacker.discord.longestStreakDays}
                      messageCount={hacker.discord.messageCount}
                    />
                    {/* The same tracker the member panel renders, not a second
                      implementation that would drift from it. */}
                    <DiscordActivityTracker
                      activity={hacker.discord.activity}
                      activityEndDate={hacker.discord.activityEndDate}
                    />
                  </DetailSection>
                ) : null}

                <HackerEventAttendancePanel
                  attendeeId={hacker.attendeeId}
                  hackathonId={hackathonId}
                />

                {(hacker.resumeUrl ??
                hacker.githubProfileUrl ??
                hacker.linkedinProfileUrl ??
                hacker.websiteUrl) ? (
                  <DetailSection
                    description="Whatever they chose to share."
                    icon={ExternalLink}
                    title="Links"
                  >
                    <LinkRow label="Resume" url={hacker.resumeUrl} />
                    <LinkRow label="GitHub" url={hacker.githubProfileUrl} />
                    <LinkRow label="LinkedIn" url={hacker.linkedinProfileUrl} />
                    <LinkRow label="Website" url={hacker.websiteUrl} />
                  </DetailSection>
                ) : null}

                <DetailSection
                  className="border-destructive/30 lg:col-span-2"
                  description="Remove this hackathon application so the participant can submit it again."
                  icon={Trash2}
                  title="Delete application"
                >
                  <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <p className="text-sm leading-5 text-muted-foreground">
                      Their Blade account and reusable profile remain. Status,
                      points, agreements, and check-ins for this hackathon are
                      removed permanently.
                    </p>
                    <DeleteApplicationDialog
                      attendeeId={hacker.attendeeId}
                      blocked={blocked}
                      name={hacker.name}
                      onDeleted={() => {
                        onOpenChange(false);
                        onSaved();
                      }}
                    />
                  </div>
                </DetailSection>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteApplicationDialog({
  attendeeId,
  blocked,
  name,
  onDeleted,
}: {
  attendeeId: string;
  blocked: boolean;
  name: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setConfirmed(false);
  };
  const remove = api.hacker.deleteApplication.useMutation({
    onError: (error) =>
      toast.error(error.message || "Application could not be deleted."),
    onSuccess: () => {
      toast.success("Application deleted. They can apply again now.");
      setOpen(false);
      setConfirmed(false);
      onDeleted();
    },
  });

  return (
    <>
      <Button
        className="min-h-11 shrink-0 gap-2"
        disabled={blocked}
        onClick={() => setOpen(true)}
        type="button"
        variant="destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete application
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="z-[70] border-destructive/30 bg-card/95 motion-reduce:animate-none">
          <DialogHeader>
            <DialogTitle>Delete {name}&apos;s application?</DialogTitle>
            <DialogDescription>
              This permanently removes this hackathon application, including its
              status, points, agreements, and check-ins. Their Blade account and
              reusable profile remain, so they can apply again. Past emails and
              the admin audit record remain.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Checkbox
              checked={confirmed}
              id="delete-hacker-application-confirmation"
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label
              className="cursor-pointer text-sm leading-5"
              htmlFor="delete-hacker-application-confirmation"
            >
              I understand this permanently deletes this application and its
              hackathon activity.
            </Label>
          </div>
          <DialogFooter>
            <Button
              disabled={remove.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={remove.isPending || !confirmed}
              onClick={() =>
                remove.mutate({
                  attendeeId,
                  confirmed: true,
                })
              }
              type="button"
              variant="destructive"
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Delete application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The whole application, editable, laid out the way the member edit form is.
 *
 * Sections rather than one flat list, matching what the read view shows, so an
 * officer fixing a school looks in the same place they just read it. Only the
 * fields that actually changed are sent, so an untouched value is absent from
 * the patch rather than rewritten with itself.
 *
 * Uncontrolled inputs: mirroring twenty values into state to correct one adds
 * twenty ways for the form to disagree with the record it is editing.
 */
function HackerEditForm({
  busy,
  hacker,
  onCancel,
  onSave,
}: {
  busy: boolean;
  hacker: HackerEditable;
  onCancel: () => void;
  onSave: (patch: Record<string, number | string | null>) => void;
}) {
  const sections: {
    fields: {
      label: string;
      name: string;
      options?: readonly string[];
      type?: string;
      value: string;
    }[];
    title: string;
  }[] = [
    {
      fields: [
        { label: "First name", name: "firstName", value: hacker.firstName },
        { label: "Last name", name: "lastName", value: hacker.lastName },
        { label: "Email", name: "email", type: "email", value: hacker.email },
        {
          label: "Phone",
          name: "phoneNumber",
          type: "tel",
          value: hacker.phoneNumber,
        },
        {
          label: "Discord handle",
          name: "discordUser",
          value: hacker.discordUser,
        },
        {
          label: "Country",
          name: "country",
          options: FORMS.COUNTRIES,
          value: hacker.country,
        },
      ],
      title: "Contact",
    },
    {
      fields: [
        {
          label: "School",
          name: "school",
          options: FORMS.SCHOOLS,
          value: hacker.school,
        },
        {
          label: "Level of study",
          name: "levelOfStudy",
          options: FORMS.LEVELS_OF_STUDY,
          value: hacker.levelOfStudy,
        },
        {
          label: "Major",
          name: "major",
          options: FORMS.MAJORS,
          value: hacker.major,
        },
        {
          label: "Graduation date",
          name: "gradDate",
          type: "date",
          value: hacker.gradDate.slice(0, 10),
        },
      ],
      title: "Study",
    },
    {
      fields: [
        {
          // The date of birth, not the age: age is derived on every read now,
          // so a hand-typed age would be discarded on the next render.
          label: "Date of birth",
          name: "dob",
          type: "date",
          value: hacker.dob.slice(0, 10),
        },
        {
          label: "Gender",
          name: "gender",
          options: FORMS.GENDERS,
          value: hacker.gender,
        },
        {
          label: "Race or ethnicity",
          name: "raceOrEthnicity",
          options: FORMS.RACES_OR_ETHNICITIES,
          value: hacker.raceOrEthnicity,
        },
        {
          label: "Shirt size",
          name: "shirtSize",
          options: FORMS.SHIRT_SIZES,
          value: hacker.shirtSize,
        },
        {
          label: "Dietary",
          name: "foodAllergies",
          value: hacker.foodAllergies ?? "",
        },
      ],
      title: "Hackathon",
    },
    {
      fields: [
        { label: "Resume", name: "resumeUrl", value: hacker.resumeUrl ?? "" },
        {
          label: "GitHub",
          name: "githubProfileUrl",
          value: hacker.githubProfileUrl ?? "",
        },
        {
          label: "LinkedIn",
          name: "linkedinProfileUrl",
          value: hacker.linkedinProfileUrl ?? "",
        },
        {
          label: "Website",
          name: "websiteUrl",
          value: hacker.websiteUrl ?? "",
        },
      ],
      title: "Links",
    },
  ];
  const nullable = new Set([
    "foodAllergies",
    "githubProfileUrl",
    "linkedinProfileUrl",
    "websiteUrl",
  ]);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const patch: Record<string, number | string | null> = {};
        for (const { fields } of sections) {
          for (const { name, value: original } of fields) {
            const entry = data.get(name);
            const raw = typeof entry === "string" ? entry.trim() : "";
            if (raw === original.trim()) continue;
            // Cleared on purpose is a real answer for these — "nothing to
            // accommodate", "no resume" — so it survives as null, not "".
            else if (nullable.has(name)) patch[name] = raw === "" ? null : raw;
            else if (raw !== "") patch[name] = raw;
          }
        }
        onSave(patch);
      }}
    >
      {sections.map(({ fields, title }) => (
        <section
          className="space-y-4 rounded-md border border-white/10 bg-background/60 p-4"
          key={title}
        >
          <h3 className="font-semibold">{title}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map(({ label, name, options, type, value }) => (
              <div className="space-y-2" key={name}>
                <Label htmlFor={`hacker-edit-${name}`}>{label}</Label>
                {options ? (
                  <select
                    className="h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={value}
                    disabled={busy}
                    id={`hacker-edit-${name}`}
                    name={name}
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="h-11 bg-background/70"
                    defaultValue={value}
                    disabled={busy}
                    id={`hacker-edit-${name}`}
                    name={name}
                    type={type}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border/70 bg-card py-4 sm:flex-row sm:justify-end">
        <Button
          disabled={busy}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={busy} type="submit">
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Save application
        </Button>
      </div>
    </form>
  );
}

function LinkRow({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <DetailRow
      label={label}
      value={
        <a
          className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      }
    />
  );
}
