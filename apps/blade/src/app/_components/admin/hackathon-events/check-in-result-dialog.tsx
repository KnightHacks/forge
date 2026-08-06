"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

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

import type { FirstTimeStatus } from "~/app/_components/admin/hackathon/hackers/first-time-status";
import { formatUtcDate } from "~/lib/dates";

export type HackathonCheckInOutcome =
  | "checked_in"
  | "already_checked_in"
  | "invalid_qr"
  | "hacker_not_found"
  | "wrong_status"
  | "not_checked_in"
  | "wrong_class"
  | "not_ready"
  | "unknown";

export interface HackathonCheckInResult {
  attemptId: string;
  checkedInAt: Date | string;
  class: { color: string; name: string } | null;
  dateOfBirth: string | null;
  eventName: string;
  eventPurpose: "event" | "primary_check_in";
  firstTimeStatus: FirstTimeStatus;
  hackerName: string | null;
  isVip: boolean;
  operatorName: string;
  outcome: HackathonCheckInOutcome;
  pointsAwarded: number;
  roleDelivery: {
    grants: {
      kind: "class" | "general" | "vip";
      state: "failed" | "pending" | "succeeded" | "unknown";
    }[];
    needsAttention: boolean;
  } | null;
  statusAtAttempt: string | null;
  wasMinorAtAttempt: boolean;
}

const OUTCOME_COPY: Record<
  HackathonCheckInOutcome,
  { description: string; label: string; tone: "error" | "success" | "warning" }
> = {
  already_checked_in: {
    description: "No attendance or points were added by this attempt.",
    label: "Already checked in",
    tone: "warning",
  },
  checked_in: {
    description: "Attendance was recorded successfully.",
    label: "Checked in",
    tone: "success",
  },
  hacker_not_found: {
    description: "No hacker account matched this code or manual selection.",
    label: "Hacker not found",
    tone: "error",
  },
  invalid_qr: {
    description: "Use a valid Knight Hacks account QR code.",
    label: "Invalid QR code",
    tone: "error",
  },
  not_checked_in: {
    description: "They must complete primary hackathon check-in first.",
    label: "Not admitted to the hackathon",
    tone: "error",
  },
  not_ready: {
    description: "The hackathon or event is not configured for this check-in.",
    label: "Check-in is not ready",
    tone: "error",
  },
  unknown: {
    description:
      "The request may have reached Blade. Check history before trying again.",
    label: "Outcome unknown",
    tone: "warning",
  },
  wrong_class: {
    description: "This station is currently calling a different class.",
    label: "Wrong class for this station",
    tone: "error",
  },
  wrong_status: {
    description:
      "Their current application status does not allow this check-in.",
    label: "Application status is not eligible",
    tone: "error",
  },
};

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-background/60 p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

export function CheckInResultDialog({
  onOpenChange,
  onRetryRoles,
  open,
  result,
  retryingRoles = false,
}: {
  onOpenChange: (open: boolean) => void;
  onRetryRoles?: () => void;
  open: boolean;
  result: HackathonCheckInResult | null;
  retryingRoles?: boolean;
}) {
  const outcome = result ? OUTCOME_COPY[result.outcome] : null;
  const roleProblem = result?.roleDelivery?.needsAttention === true;

  return (
    <Dialog onOpenChange={onOpenChange} open={open && result !== null}>
      <DialogContent
        className="inset-0 left-0 top-0 flex h-[100svh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-card p-0 shadow-2xl motion-reduce:animate-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100svh-2rem)] sm:w-[calc(100svw-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-white/10"
        onPointerDownOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        {result && outcome ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border/70 bg-background/40 px-4 py-4 pr-16 text-left sm:px-6 sm:py-5 sm:pr-16">
              <div className="flex items-start gap-3">
                {outcome.tone === "success" ? (
                  <CheckCircle2
                    className="mt-0.5 size-7 shrink-0 text-[hsl(var(--chart-2))]"
                    aria-hidden="true"
                  />
                ) : outcome.tone === "warning" ? (
                  <CircleAlert
                    className="mt-0.5 size-7 shrink-0 text-[hsl(var(--chart-3))]"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 size-7 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <DialogTitle className="text-2xl leading-tight">
                    {outcome.label}
                  </DialogTitle>
                  <DialogDescription className="mt-1 leading-6">
                    {outcome.description}
                  </DialogDescription>
                </div>
              </div>
              <Button
                aria-label="Close check-in result"
                className="absolute right-3 top-3 min-h-11 min-w-11"
                onClick={() => onOpenChange(false)}
                size="icon"
                variant="ghost"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {result.wasMinorAtAttempt ? (
                <div
                  className="rounded-lg border-2 border-destructive bg-destructive/20 p-5"
                  role="alert"
                >
                  <p className="flex items-center gap-2 text-xl font-semibold text-foreground">
                    <ShieldAlert
                      className="size-7 shrink-0"
                      aria-hidden="true"
                    />
                    MINOR — under 18 at check-in
                  </p>
                </div>
              ) : null}

              {roleProblem ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
                  <p className="font-semibold text-destructive">
                    Checked in; Discord roles need attention
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Physical admission and points remain recorded. Retry only
                    the failed role delivery.
                  </p>
                </div>
              ) : null}

              <dl className="grid gap-2 sm:grid-cols-2">
                <Fact
                  label="Class"
                  value={
                    result.class ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="size-4 shrink-0 rounded-full border border-white/30"
                          style={{ backgroundColor: result.class.color }}
                        />
                        {result.class.name}
                      </span>
                    ) : (
                      "Not assigned"
                    )
                  }
                />
                <Fact
                  label="VIP"
                  value={
                    result.isVip ? (
                      <Badge className="gap-1" variant="secondary">
                        <Sparkles className="size-3" aria-hidden="true" /> VIP
                      </Badge>
                    ) : (
                      "No"
                    )
                  }
                />
                <Fact
                  label="Full name"
                  value={result.hackerName ?? "Not resolved"}
                />
                <Fact
                  label="Date of birth"
                  value={formatUtcDate(result.dateOfBirth, "Not available")}
                />
              </dl>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-border/70 bg-card px-4 py-3 sm:px-6">
              {roleProblem && onRetryRoles ? (
                <Button
                  className="min-h-11 gap-2"
                  disabled={retryingRoles}
                  onClick={onRetryRoles}
                  variant="secondary"
                >
                  {retryingRoles ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <RotateCcw className="size-4" aria-hidden="true" />
                  )}
                  Retry Discord roles
                </Button>
              ) : null}
              <Button className="min-h-11" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
