"use client";

import { useState } from "react";
import {
  Ban,
  CalendarCheck,
  ExternalLink,
  GraduationCap,
  Loader2,
  MailWarning,
  MessageSquareText,
  Pencil,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FORMS } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import {
  DetailRow,
  DetailSection,
  SummaryMetric,
} from "~/app/_components/admin/shared/detail-panel";
import { DiscordActivityTracker } from "~/app/_components/admin/shared/discord-activity-tracker";
import { api } from "~/trpc/react";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

/** Only what the edit form reads, so it does not depend on the whole DTO. */
interface HackerEditable {
  age: number;
  country: string;
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
  onOpenChange,
  onSaved,
}: {
  attendeeId: string | null;
  blocked: boolean;
  blockedReason: string | null;
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
        {/*
          Always rendered, even while loading or on failure. A DialogContent
          without a DialogTitle is an unnamed dialog to a screen reader, and
          Radix logs it.
        */}
        {hacker ? null : (
          <DialogHeader>
            <DialogTitle>
              {detail.isError ? "Could not load applicant" : "Applicant"}
            </DialogTitle>
            <DialogDescription>
              {detail.isError ? detail.error.message : "Loading their record…"}
            </DialogDescription>
          </DialogHeader>
        )}

        {detail.isPending ? (
          <p className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading applicant…
          </p>
        ) : null}

        {detail.isError ? (
          <Button
            className="min-h-11 justify-self-start"
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
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">Blacklisted</p>
                <p className="mt-1 text-sm text-destructive/90">
                  {hacker.blacklistReason}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
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
                  description="What they gave us, and how to reach them."
                  icon={UserRound}
                  title="Contact"
                >
                  <DetailRow label="Email" value={hacker.email} />
                  <DetailRow label="Phone" value={hacker.phoneNumber} />
                  <DetailRow label="Country" value={hacker.country} />
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
                  <DetailRow
                    label="Race / ethnicity"
                    value={hacker.raceOrEthnicity}
                  />
                  <DetailRow label="Shirt" value={hacker.shirtSize} />
                  <DetailRow
                    label="First hackathon"
                    value={hacker.isFirstTime ? "Yes" : "No"}
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
                    <div className="grid grid-cols-2 gap-2 border-b border-border/70 p-3 sm:grid-cols-4 sm:p-4">
                      <SummaryMetric
                        label="Messages"
                        value={hacker.discord.messageCount}
                      />
                      <SummaryMetric
                        label="Active days"
                        value={hacker.discord.activeDayCount}
                      />
                      <SummaryMetric
                        label="Surfaces"
                        value={hacker.discord.activeChannelCount}
                      />
                      <SummaryMetric
                        label="Last message"
                        value={
                          <span className="font-sans text-sm font-medium">
                            {hacker.discord.lastMessageAt
                              ? new Date(
                                  hacker.discord.lastMessageAt,
                                ).toLocaleDateString()
                              : "None"}
                          </span>
                        }
                      />
                    </div>
                    {/* The same tracker the member panel renders, not a second
                      implementation that would drift from it. */}
                    <DiscordActivityTracker
                      activity={hacker.discord.activity}
                      activityEndDate={hacker.discord.activityEndDate}
                    />
                  </DetailSection>
                ) : null}

                <DetailSection
                  description="Check-ins for this hackathon's own events."
                  icon={CalendarCheck}
                  title="Hackathon events"
                >
                  {/*
                  TODO: hackathon events do not exist yet. When they do, this
                  becomes attendance for *this hackathon's* events — workshops,
                  ceremonies, meals — and deliberately not the club event feed:
                  during a hackathon an organiser cares who came to the opening
                  ceremony, not who came to a GBM in March.
                */}
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-4">
                    Hackathon events are not built yet, so there is no
                    attendance to show.
                  </p>
                </DetailSection>

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
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
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
          label: "Age",
          name: "age",
          type: "number",
          value: String(hacker.age),
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
            if (name === "age") patch[name] = Number(raw);
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
