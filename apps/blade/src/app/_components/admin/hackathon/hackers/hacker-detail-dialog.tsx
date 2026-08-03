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
import { Label } from "@forge/ui/label";
import { Separator } from "@forge/ui/separator";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import { api } from "~/trpc/react";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

/** `checkedin` is filterable but not settable, so it has no label entry. */
function statusLabel(status: string) {
  return status in HACKER_STATUS_LABELS
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
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Re-seeded per applicant, so one person's reason cannot follow another.
  if (attendeeId && seededFor !== attendeeId) {
    setSeededFor(attendeeId);
    setReason("");
  }
  if (!attendeeId && seededFor !== null) setSeededFor(null);

  const detail = api.hacker.get.useQuery(
    { attendeeId: attendeeId ?? "" },
    { enabled: attendeeId !== null },
  );
  const hacker = detail.data;

  const setStatus = api.hacker.setStatus.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Status updated. The email is queued.");
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

  const busy = setStatus.isPending || setBlacklist.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={attendeeId !== null}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
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
              <DialogDescription className="break-all">
                Applied {new Date(hacker.timeApplied).toLocaleDateString()}
                {hacker.timeConfirmed
                  ? ` · confirmed ${new Date(hacker.timeConfirmed).toLocaleDateString()}`
                  : ""}
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

            <Section title="Contact">
              <Field label="Email" value={hacker.email} />
              <Field label="Phone" value={hacker.phoneNumber} />
              <Field label="Discord" value={`@${hacker.discordUser}`} />
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
              <Field label="Points" value={String(hacker.points)} />
              <Field label="Age" value={String(hacker.age)} />
              <Field label="Shirt" value={hacker.shirtSize} />
              <Field
                label="First hackathon"
                value={hacker.isFirstTime ? "Yes" : "No"}
              />
              <Field label="Dietary" value={hacker.foodAllergies} />
              <Field label="Race / ethnicity" value={hacker.raceOrEthnicity} />
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
