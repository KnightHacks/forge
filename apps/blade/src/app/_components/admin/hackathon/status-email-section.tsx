"use client";

import { useState } from "react";
import { Check, Loader2, Mail, TriangleAlert, Wand2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { HackathonSendingStatus } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { STATUS_COPY, SUBJECT_FIELDS } from "./status-copy";

type Detail = RouterOutputs["hackathon"]["get"];
type Templates = RouterOutputs["email"]["listTemplates"];

interface RowDraft {
  subject: string;
  templateId: string;
}

export function StatusEmailSection({
  detail,
  isRefreshing,
  onSaved,
  templates,
}: {
  detail: Detail;
  isRefreshing: boolean;
  onSaved: () => void;
  templates: Templates;
}) {
  const configured = new Map(
    detail.statusEmails.map((row) => [row.status, row]),
  );
  const [drafts, setDrafts] = useState<
    Record<HackathonSendingStatus, RowDraft>
  >(
    () =>
      Object.fromEntries(
        detail.sendingStatuses.map((status) => {
          const existing = configured.get(status);
          return [
            status,
            {
              subject: existing?.subject ?? "",
              templateId: existing?.templateId ?? "",
            },
          ];
        }),
      ) as Record<HackathonSendingStatus, RowDraft>,
  );
  const [savingStatus, setSavingStatus] =
    useState<HackathonSendingStatus | null>(null);
  const [clearingStatus, setClearingStatus] =
    useState<HackathonSendingStatus | null>(null);

  // Reads `current[status]` rather than the render-time `draft`, so a patch
  // cannot be built from a stale row. Correct today either way — these all fire
  // from discrete events, which React flushes synchronously — but that is an
  // accident of the call sites, not a property of the code.
  const patch = (status: HackathonSendingStatus, next: Partial<RowDraft>) =>
    setDrafts((current) => ({
      ...current,
      [status]: { ...current[status], ...next },
    }));

  const save = api.hackathon.setStatusEmail.useMutation({
    onError: (error) => {
      setSavingStatus(null);
      toast.error(error.message);
    },
    onSuccess: () => {
      setSavingStatus(null);
      toast.success("Status email saved.");
      onSaved();
    },
  });

  const clear = api.hackathon.clearStatusEmail.useMutation({
    // Refreshes on failure too. `clearStatusEmail` now returns NOT_FOUND when
    // it removed nothing, and the way that happens is another officer having
    // cleared the same row first — so without this the row keeps its subject,
    // its template and its Clear button, the header keeps under-counting, and
    // every further click re-toasts the same error.
    onError: (error) => {
      setClearingStatus(null);
      toast.error(error.message);
      onSaved();
    },
    onSuccess: (_result, variables) => {
      setClearingStatus(null);
      // The row stays on screen, so the draft has to be emptied too — otherwise
      // it still shows the subject and template that were just unset, and the
      // Save button next to it would silently write them back.
      setDrafts((current) => ({
        ...current,
        [variables.status]: { subject: "", templateId: "" },
      }));
      toast.success("Status email cleared.");
      onSaved();
    },
  });

  const missingCount = detail.sendingStatuses.filter(
    (status) => !configured.has(status),
  ).length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" aria-hidden="true" /> Status emails
          </CardTitle>
          {missingCount > 0 ? (
            <Badge className="gap-1" variant="destructive">
              <TriangleAlert className="size-3" aria-hidden="true" />
              {missingCount} missing
            </Badge>
          ) : (
            <Badge className="gap-1" variant="secondary">
              <Check className="size-3" aria-hidden="true" /> Complete
            </Badge>
          )}
        </div>
        <CardDescription className="space-y-3">
          <span className="block">
            One template and subject for each status an applicant can reach.
            Checking in sends nothing, so there are six rather than seven. All
            six should be set before this hackathon is used — accepting two
            hundred people with one template missing would leave some of them
            untold. Nothing enforces that yet, because hacker management is a
            later slice; this screen is where the mail gets ready for it.
          </span>
          <span className="block">
            Only templates marked as hackathon templates appear in the picker. A
            club template can reference member and team fields, and a hacker
            need not be a club member, so those would render blank for exactly
            the people this mail is addressed to.
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <SubjectFieldGuide />

        {templates.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No hackathon email templates are available. Create one in the email
            portal and set it to Hackathon — or, if you archived the one you
            were using, restore it there. Archived templates do not appear
            below.
          </p>
        ) : null}

        {detail.sendingStatuses.map((status) => {
          // Keyed off the same `detail.sendingStatuses` the drafts record was
          // built from, so every row has an entry.
          const draft = drafts[status];
          const copy = STATUS_COPY[status];
          const isConfigured = configured.has(status);
          // Spinner tracks the clicked row; the disable tracks the whole
          // section. Disabling only the clicked row let an officer fire a
          // second save whose spinner was then cleared by the first response.
          const saving = savingStatus === status;
          const busy = save.isPending || clear.isPending || isRefreshing;
          const complete =
            draft.subject.trim() !== "" && draft.templateId !== "";
          // Two different failures, so two different signals. Both come from
          // the server, which joins the bound template directly, rather than
          // from "is it missing from the picker list" — that list is capped at
          // 100, so absence from it would accuse a perfectly valid binding of
          // having been retired.
          const saved = configured.get(status);
          const archivedTemplate = saved?.templateArchived === true;
          const movedTemplate =
            saved !== undefined &&
            !archivedTemplate &&
            saved.templateDomain !== "hackathon";

          return (
            <div
              className="grid gap-3 rounded-md border p-4"
              data-configured={isConfigured ? "true" : undefined}
              key={status}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{copy.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Sends when: {copy.blurb}
                  </p>
                </div>
                {isConfigured ? null : (
                  <Badge variant="destructive">Not set</Badge>
                )}
              </div>

              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Example:</span>
                  <code className="break-all font-mono text-xs">
                    {copy.example}
                  </code>
                  <Button
                    aria-label={`Use the example subject for ${copy.label}`}
                    className="h-auto gap-1 p-0 text-xs"
                    onClick={() => patch(status, { subject: copy.example })}
                    type="button"
                    variant="link"
                  >
                    <Wand2 className="size-3" aria-hidden="true" /> Use this
                  </Button>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.rationale}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`subject-${status}`}>Subject</Label>
                  <Input
                    id={`subject-${status}`}
                    // Matches the server's `.max(200)`. Without it a long paste
                    // reaches Zod, and tRPC's default message for an input
                    // parse failure is a JSON blob, which is what the toast
                    // would show the officer.
                    maxLength={200}
                    onChange={(event) =>
                      patch(status, { subject: event.target.value })
                    }
                    placeholder={copy.example}
                    value={draft.subject}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`template-${status}`}>Template</Label>
                  <ResponsiveComboBox
                    ariaLabel={`${copy.label} email template`}
                    buttonPlaceholder="Choose a template"
                    getItemLabel={(template) => template.name}
                    getItemValue={(template) => template.id}
                    inputPlaceholder="Search templates..."
                    items={templates}
                    onValueChange={(value) =>
                      patch(status, { templateId: value })
                    }
                    renderItem={(template) => template.name}
                    triggerId={`template-${status}`}
                    value={draft.templateId || null}
                  />
                  {/*
                    The picker only holds hackathon-domain, non-archived
                    templates, but the saved id comes from the hackathon's own
                    config. When the two disagree `ResponsiveComboBox` finds no
                    match and falls back to its placeholder — reading exactly
                    like "nothing is configured" while the row still counts as
                    complete. Naming which of the two happened is the difference
                    between a confusing screen and an actionable one.
                  */}
                  {saved && archivedTemplate ? (
                    <p className="text-sm text-destructive">
                      {saved.templateName} is archived, so this status would
                      send retired mail. Pick another template, or restore that
                      one in the email portal.
                    </p>
                  ) : null}
                  {saved && movedTemplate ? (
                    <p className="text-sm text-destructive">
                      {saved.templateName} is no longer a hackathon template.
                      Pick another, or set it back to Hackathon in the email
                      portal.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  // Six rows render six buttons reading exactly "Save". Without
                  // this, a screen reader's button list is six identical
                  // entries with nothing tying any of them to a status.
                  aria-label={`Save ${copy.label} email`}
                  className="min-h-11 gap-2"
                  disabled={busy || !complete}
                  onClick={() => {
                    setSavingStatus(status);
                    save.mutate({
                      hackathonId: detail.hackathon.id,
                      status,
                      subject: draft.subject,
                      templateId: draft.templateId,
                    });
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {saving ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  Save
                </Button>
                {/*
                  Only offered once a row is actually configured. Without it a
                  status could be overwritten but never unset, which matters
                  because clearing one is how an officer deliberately takes a
                  hackathon back out of the configured state.

                  To be explicit, since the wording here used to imply
                  otherwise: `isConfigured` is computed by `list` and `get` and
                  read by nothing but this screen. It gates no mutation. It is
                  the readiness signal hacker management is expected to consume
                  once it exists — not a guard that exists today.
                */}
                {isConfigured ? (
                  <Button
                    aria-label={`Clear ${copy.label} email`}
                    className="min-h-11 gap-2"
                    disabled={busy}
                    onClick={() => {
                      setClearingStatus(status);
                      clear.mutate({
                        hackathonId: detail.hackathon.id,
                        status,
                      });
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {clearingStatus === status && clear.isPending ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SubjectFieldGuide() {
  return (
    <div className="rounded-md border p-4">
      <p className="font-medium">Subject lines can interpolate</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Write <code className="font-mono text-xs">{"{{field.name}}"}</code>{" "}
        anywhere in a subject and it will be replaced with that hacker&rsquo;s
        value when the mail sends. Dates arrive already formatted — there is no
        way to format one from a subject, so they are pre-rendered rather than
        handed over as raw timestamps. A field with no value renders as nothing
        rather than leaving the braces visible to the hacker.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        A misspelt field is rejected when you press Save — that check runs now,
        even though the sending itself belongs to hacker management and is not
        built yet.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {SUBJECT_FIELDS.map((entry) => (
          <div className="min-w-0 text-sm" key={entry.field}>
            <dt>
              <code className="break-all font-mono text-xs">{`{{${entry.field}}}`}</code>
            </dt>
            <dd className="text-xs text-muted-foreground">
              <span className="text-foreground">{entry.example}</span> —{" "}
              {entry.note}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
