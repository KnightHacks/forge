"use client";

import { useState } from "react";
import { Ban, ExternalLink, Loader2, MailWarning } from "lucide-react";

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
import { Separator } from "@forge/ui/separator";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import { DiscordActivityTracker } from "~/app/_components/admin/shared/discord-activity-tracker";
import { api } from "~/trpc/react";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

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
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-3xl overflow-y-auto border-white/10 bg-card/95 shadow-2xl">
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
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 break-words leading-tight">
                {hacker.name}
                <Badge className="text-sm" variant="secondary">
                  {statusLabel(hacker.status)}
                </Badge>
                {hacker.blacklisted ? (
                  <Badge className="gap-1 text-sm" variant="destructive">
                    <Ban className="size-3" aria-hidden="true" /> Blacklisted
                  </Badge>
                ) : null}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 break-all">
                <span>
                  Applied {new Date(hacker.timeApplied).toLocaleDateString()}
                  {hacker.timeConfirmed
                    ? ` · confirmed ${new Date(hacker.timeConfirmed).toLocaleDateString()}`
                    : ""}
                </span>
                <Button
                  className="h-8"
                  disabled={busy || blocked}
                  onClick={() => setEditing((current) => !current)}
                  size="sm"
                  variant="ghost"
                >
                  {editing ? "Stop editing" : "Edit application"}
                </Button>
              </DialogDescription>
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
            ) : null}

            <Section title="Contact">
              <Field label="Email" value={hacker.email} />
              <Field label="Phone" value={hacker.phoneNumber} />
              <Field label="Country" value={hacker.country} />
            </Section>

            <Section title="Study">
              <Field label="School" value={hacker.school} />
              <Field label="Level" value={hacker.levelOfStudy} />
              <Field label="Major" value={hacker.major} />
              <Field
                label="Graduates"
                value={new Date(hacker.gradDate).toLocaleDateString(undefined, {
                  month: "long",
                  timeZone: "UTC",
                  year: "numeric",
                })}
              />
            </Section>

            <Section title="Hackathon">
              <Field label="Age" value={String(hacker.age)} />
              <Field label="Shirt" value={hacker.shirtSize} />
              <Field
                label="First hackathon"
                value={hacker.isFirstTime ? "Yes" : "No"}
              />
              <Field label="Dietary" value={hacker.foodAllergies} />
              <Field label="Race / ethnicity" value={hacker.raceOrEthnicity} />
            </Section>

            {/*
              Points live here rather than as a roster column: during triage the
              number is almost always zero and cost a wide right rail, and the
              award control has to sit somewhere volunteers cannot reach — which
              rules out the check-in screen.
            */}
            <Section title="Points">
              <Field label="Total" value={String(hacker.points)} />
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Adjust</dt>
                <dd className="mt-1 grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
                  <Input
                    aria-label="Points to add or subtract"
                    className="h-11"
                    disabled={busy || blocked}
                    inputMode="numeric"
                    onChange={(event) => setPointDelta(event.target.value)}
                    placeholder="+10"
                    type="number"
                    value={pointDelta}
                  />
                  <Input
                    aria-label="Reason for the adjustment"
                    className="h-11"
                    disabled={busy || blocked}
                    maxLength={300}
                    onChange={(event) => setPointReason(event.target.value)}
                    placeholder="Why? e.g. won the hardware challenge"
                    value={pointReason}
                  />
                  <Button
                    className="min-h-11"
                    disabled={
                      busy ||
                      blocked ||
                      Number(pointDelta) === 0 ||
                      pointDelta.trim() === "" ||
                      pointReason.trim() === ""
                    }
                    onClick={() =>
                      awardPoints.mutate({
                        attendeeId: hacker.attendeeId,
                        delta: Number(pointDelta),
                        reason: pointReason,
                      })
                    }
                    variant="secondary"
                  >
                    Apply
                  </Button>
                </dd>
                <p className="mt-1 text-sm text-muted-foreground">
                  A change, not a new total, so two officers awarding at once
                  add up. Recorded in the admin log under your name.
                </p>
              </div>
            </Section>

            <Section title="Discord">
              {/*
                Two facts, because they answer different questions. The handle is
                what the applicant typed and is the thing to search for; the
                snowflake is the account Blade actually linked, and is what stays
                correct after a rename. An organiser chasing someone whose email
                bounced needs the second.
              */}
              <Field label="Handle" value={`@${hacker.discordUser}`} />
              <Field
                label="Account"
                value={hacker.discordUserId ?? "Not linked to a Blade account"}
              />
              {hacker.discordUserId ? (
                <div className="min-w-0">
                  <dt className="text-sm text-muted-foreground">Open</dt>
                  <dd>
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
                  </dd>
                </div>
              ) : null}
            </Section>

            {hacker.discord ? (
              <Section title="Discord engagement">
                <Field
                  label="Messages"
                  value={String(hacker.discord.messageCount)}
                />
                <Field
                  label="Active days"
                  value={String(hacker.discord.activeDayCount)}
                />
                <Field
                  label="Channels"
                  value={String(hacker.discord.activeChannelCount)}
                />
                <Field
                  label="Last message"
                  value={
                    hacker.discord.lastMessageAt
                      ? new Date(
                          hacker.discord.lastMessageAt,
                        ).toLocaleDateString()
                      : "No messages"
                  }
                />
                <div className="sm:col-span-2">
                  {/* The same tracker the member dashboard shows, not a second
                      implementation that would drift from it. */}
                  <DiscordActivityTracker
                    activity={hacker.discord.activity}
                    activityEndDate={hacker.discord.activityEndDate}
                  />
                  {hacker.discord.topChannels.length > 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Most active in{" "}
                      {hacker.discord.topChannels
                        .slice(0, 3)
                        .map((channel) => `#${channel.name}`)
                        .join(", ")}
                      .
                    </p>
                  ) : null}
                </div>
              </Section>
            ) : null}

            <Section title="Hackathon events">
              {/*
                TODO: hackathon events do not exist yet. When they do, this
                becomes attendance for *this hackathon's* events — workshops,
                ceremonies, meals — and nothing else. It is deliberately not the
                club event feed: an organiser looking at an applicant during a
                hackathon cares who showed up to the opening ceremony, not who
                came to a GBM in March.
              */}
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Hackathon events are not built yet, so there is no attendance to
                show. This is where check-ins for this hackathon&rsquo;s events
                will appear.
              </p>
            </Section>

            {(hacker.resumeUrl ??
            hacker.githubProfileUrl ??
            hacker.linkedinProfileUrl ??
            hacker.websiteUrl) ? (
              <Section title="Links">
                <LinkField label="Resume" url={hacker.resumeUrl} />
                <LinkField label="GitHub" url={hacker.githubProfileUrl} />
                <LinkField label="LinkedIn" url={hacker.linkedinProfileUrl} />
                <LinkField label="Website" url={hacker.websiteUrl} />
              </Section>
            ) : null}

            <Separator />

            <div className="grid gap-2">
              <p className="font-medium">Move to</p>
              {blocked ? (
                <p className="text-sm text-muted-foreground">{blockedReason}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sends that status&rsquo;s configured email immediately. It
                  cannot be recalled.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
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
                      variant={status === "accepted" ? "primary" : "secondary"}
                    >
                      {HACKER_STATUS_LABELS[status]}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <Separator />

            {hacker.blacklisted ? (
              <Button
                className="min-h-11 gap-2 justify-self-start"
                // Respects the same gate the status buttons do. An officer
                // reading "this roster is read-only" should not be able to
                // scroll down and blacklist someone anyway.
                disabled={busy || blocked}
                onClick={() =>
                  setBlacklist.mutate({
                    attendeeId: hacker.attendeeId,
                    blacklisted: false,
                  })
                }
              >
                {setBlacklist.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Remove blacklist
              </Button>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="detail-blacklist-reason">Blacklist</Label>
                <Textarea
                  id="detail-blacklist-reason"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why should this applicant not be accepted?"
                  value={reason}
                />
                <p className="text-sm text-muted-foreground">
                  Does not change their status and sends nothing. Required, and
                  visible only here — a year from now it is the only thing that
                  explains the flag.
                </p>
                <Button
                  className="min-h-11 gap-2 justify-self-start"
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
                  {setBlacklist.isPending ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  Blacklist applicant
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The correctable fields, as a small form.
 *
 * Uncontrolled: an officer opens it to fix one field, and mirroring nine values
 * into state to do that adds nine ways for the form to disagree with the record
 * it is editing. Only what actually changed is sent, so an untouched field is
 * absent from the patch rather than rewritten with its current value.
 */
function HackerEditForm({
  busy,
  hacker,
  onCancel,
  onSave,
}: {
  busy: boolean;
  /** Only the correctable fields, so the form does not depend on the whole DTO. */
  hacker: {
    age: number;
    discordUser: string;
    email: string;
    firstName: string;
    foodAllergies: string | null;
    lastName: string;
    phoneNumber: string;
    shirtSize: string;
  };
  onCancel: () => void;
  onSave: (patch: Record<string, number | string | null>) => void;
}) {
  const fields = [
    ["firstName", "First name", hacker.firstName, "text"],
    ["lastName", "Last name", hacker.lastName, "text"],
    ["email", "Email", hacker.email, "email"],
    ["phoneNumber", "Phone", hacker.phoneNumber, "tel"],
    ["discordUser", "Discord handle", hacker.discordUser, "text"],
    ["age", "Age", String(hacker.age), "number"],
    ["shirtSize", "Shirt size", hacker.shirtSize, "text"],
    ["foodAllergies", "Dietary", hacker.foodAllergies ?? "", "text"],
  ] as const;

  return (
    <form
      className="grid gap-3 rounded-md border border-border/70 bg-background/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const patch: Record<string, number | string | null> = {};
        for (const [name, , original] of fields) {
          // `FormData.get` can hand back a `File`; these inputs are all text,
          // but narrowing keeps a stray file input from stringifying to
          // "[object Object]" and silently writing that to the record.
          const entry = data.get(name);
          const raw = typeof entry === "string" ? entry.trim() : "";
          if (raw === original.trim()) continue;
          if (name === "age") {
            patch[name] = Number(raw);
          } else if (name === "foodAllergies") {
            // Cleared on purpose means "nothing to accommodate", which is a
            // real answer and has to survive as null rather than "".
            patch[name] = raw === "" ? null : raw;
          } else if (raw !== "") {
            patch[name] = raw;
          }
        }
        onSave(patch);
      }}
    >
      <p className="text-sm font-medium">Edit application</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([name, label, original, type]) => (
          <div className="grid gap-1" key={name}>
            <Label htmlFor={`hacker-edit-${name}`}>{label}</Label>
            <Input
              className="h-11"
              defaultValue={original}
              disabled={busy}
              id={`hacker-edit-${name}`}
              name={name}
              type={type}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="min-h-11"
          disabled={busy}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button className="min-h-11" disabled={busy} type="submit">
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <dl className="grid gap-2 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{value ?? "Not given"}</dd>
    </div>
  );
}

function LinkField({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <a
          className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      </dd>
    </div>
  );
}
