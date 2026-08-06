"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "./hackathon-formatting";

type Hackathon = RouterOutputs["hackathon"]["get"]["hackathon"];

interface HackathonDraft {
  applicationDeadline: string;
  applicationOpen: string;
  applicationUrl: string;
  confirmationCapacity: string;
  confirmationDeadline: string;
  displayName: string;
  endDate: string;
  startDate: string;
  theme: string;
  timezone: string;
}

/** Ordered as the window runs, so the form reads like a timeline. */
const DATE_FIELDS = [
  ["applicationOpen", "Applications open"],
  ["applicationDeadline", "Application deadline"],
  ["confirmationDeadline", "Confirmation deadline"],
  ["startDate", "Starts"],
  ["endDate", "Ends"],
] as const;

const TIMEZONES = Intl.supportedValuesOf("timeZone");

function seed(hackathon?: Hackathon): HackathonDraft {
  if (!hackathon) {
    return {
      applicationDeadline: "",
      applicationOpen: "",
      applicationUrl: "",
      confirmationCapacity: "",
      confirmationDeadline: "",
      displayName: "",
      endDate: "",
      startDate: "",
      theme: "",
      timezone: "America/New_York",
    };
  }
  return {
    applicationDeadline: toDateTimeLocalValue(hackathon.applicationDeadline),
    applicationOpen: toDateTimeLocalValue(hackathon.applicationOpen),
    // Nullable in the database; an `<Input>` cannot hold null, so the draft
    // carries "" and the validator coerces it back.
    applicationUrl: hackathon.applicationUrl ?? "",
    confirmationCapacity: hackathon.confirmationCapacity?.toString() ?? "",
    confirmationDeadline: toDateTimeLocalValue(hackathon.confirmationDeadline),
    displayName: hackathon.displayName,
    endDate: toDateTimeLocalValue(hackathon.endDate),
    startDate: toDateTimeLocalValue(hackathon.startDate),
    theme: hackathon.theme,
    timezone: hackathon.timezone,
  };
}

export function HackathonFormDialog({
  hackathon,
  onOpenChange,
  onSaved,
  open,
}: {
  hackathon?: Hackathon;
  onOpenChange: (open: boolean) => void;
  onSaved: (hackathon: { id: string }) => void;
  open: boolean;
}) {
  const [draft, setDraft] = useState<HackathonDraft>(() => seed(hackathon));
  const update = (patch: Partial<HackathonDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  // Re-seed when the dialog *opens*, not on every prop change.
  //
  // This component stays mounted for the life of the page, so the initializer
  // above runs exactly once. `close()` re-seeds, which covered cancels — but not
  // a `router.refresh()` landing while the dialog was shut. Saving a status
  // email refreshes, so after any other edit the dialog reopened holding
  // mount-time values, visibly contradicting the header behind it, and saving
  // wrote those stale dates back over whatever had changed.
  //
  // Adjusting state during render rather than in an effect: it is the pattern
  // React documents for "state derived from a prop change", and it avoids a
  // frame where the officer sees the old values before an effect corrects them.
  // Gated on the open/closed transition, so a prop change arriving while the
  // dialog is already open cannot clobber typing.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(seed(hackathon));
  }

  const onError = (error: { message: string }) => toast.error(error.message);

  const create = api.hackathon.create.useMutation({
    onError,
    onSuccess: (created) => {
      toast.success("Hackathon created.");
      onSaved(created);
    },
  });
  const edit = api.hackathon.update.useMutation({
    onError,
    onSuccess: (updated) => {
      toast.success("Hackathon saved.");
      onSaved(updated);
    },
  });

  const saving = create.isPending || edit.isPending;
  const complete =
    draft.displayName.trim() !== "" &&
    draft.theme.trim() !== "" &&
    DATE_FIELDS.every(([field]) => draft[field] !== "");

  const submit = () => {
    const payload = {
      applicationDeadline: fromDateTimeLocalValue(draft.applicationDeadline),
      applicationOpen: fromDateTimeLocalValue(draft.applicationOpen),
      applicationUrl: draft.applicationUrl.trim() || null,
      confirmationCapacity:
        draft.confirmationCapacity.trim() === ""
          ? null
          : Number.parseInt(draft.confirmationCapacity, 10),
      confirmationDeadline: fromDateTimeLocalValue(draft.confirmationDeadline),
      displayName: draft.displayName,
      endDate: fromDateTimeLocalValue(draft.endDate),
      startDate: fromDateTimeLocalValue(draft.startDate),
      theme: draft.theme,
      timezone: draft.timezone,
    };
    if (hackathon) edit.mutate({ ...payload, id: hackathon.id });
    else create.mutate(payload);
  };

  // Radix only fires its own `onOpenChange` for closes it initiates (Escape,
  // the X, the overlay). Calling `onOpenChange` directly from Cancel skipped
  // the reset, so a cancelled edit survived and could be saved on reopen —
  // the same dialog behaving two different ways. Everything closes through
  // here now.
  const close = () => {
    setDraft(seed(hackathon));
    onOpenChange(false);
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {hackathon ? "Edit hackathon" : "New hackathon"}
          </DialogTitle>
          <DialogDescription>
            The five dates must run in order: applications open before they
            close, confirmation lands between the application deadline and the
            start, and the event ends after it starts. Times are UTC.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="hackathon-display-name">Display name</Label>
            <Input
              id="hackathon-display-name"
              onChange={(event) => update({ displayName: event.target.value })}
              placeholder="Knight Hacks X"
              value={draft.displayName}
            />
            <p className="text-xs text-muted-foreground">
              What officers and applicants see.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hackathon-timezone">Timezone</Label>
              <ResponsiveComboBox
                ariaLabel="Hackathon timezone"
                buttonPlaceholder="Choose a timezone"
                getItemLabel={(timezone) => timezone}
                getItemValue={(timezone) => timezone}
                inputPlaceholder="Search timezones"
                items={TIMEZONES}
                onValueChange={(timezone) => update({ timezone })}
                renderItem={(timezone) => timezone}
                triggerClassName="h-11 bg-background/70"
                triggerId="hackathon-timezone"
                value={draft.timezone}
              />
              <p className="text-sm text-muted-foreground">
                IANA timezone used for date-only age and event boundaries.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hackathon-confirmation-capacity">
                Confirmation capacity (optional)
              </Label>
              <Input
                id="hackathon-confirmation-capacity"
                min={0}
                onChange={(event) =>
                  update({ confirmationCapacity: event.target.value })
                }
                placeholder="No limit"
                type="number"
                value={draft.confirmationCapacity}
              />
              <p className="text-sm text-muted-foreground">
                Accepted hackers cannot confirm after this many spots fill.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hackathon-theme">Theme</Label>
            <Input
              id="hackathon-theme"
              onChange={(event) => update({ theme: event.target.value })}
              value={draft.theme}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hackathon-application-url">
              Application link (optional)
            </Label>
            <Input
              id="hackathon-application-url"
              onChange={(event) =>
                update({ applicationUrl: event.target.value })
              }
              placeholder="https://bloomknights.org/apply"
              value={draft.applicationUrl}
            />
            <p className="text-xs text-muted-foreground">
              Include https://. The actual address hackers apply at, on the
              hackathon&rsquo;s own site. Typed in rather than built from the
              route name, because that site owns its own paths and will change
              them. Blade will use this for an &ldquo;applications are
              open&rdquo; prompt on the member dashboard. Leaving it empty
              blocks nothing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {DATE_FIELDS.map(([field, label]) => (
              <div className="grid gap-2" key={field}>
                <Label htmlFor={`hackathon-${field}`}>{label}</Label>
                <Input
                  id={`hackathon-${field}`}
                  onChange={(event) => update({ [field]: event.target.value })}
                  type="datetime-local"
                  value={draft[field]}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={saving}
            onClick={close}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={saving || !complete}
            onClick={submit}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
