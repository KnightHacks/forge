"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarPlus, Copy } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
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
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";

import type { EventCreateDraft } from "./event-draft-storage";
import type { EventChannelChoice, EventTagItem } from "./types";
import {
  discardEventCreateDraft,
  loadEventCreateDraft,
  saveEventCreateDraft,
} from "./event-draft-storage";

export interface EventFormValue extends EventCreateDraft {
  values: EventCreateDraft["values"] & {
    channelId?: string;
    channelType?: "stage" | "voice";
    endOffset?: "-04:00" | "-05:00";
    startOffset?: "-04:00" | "-05:00";
  };
}

function validNewYorkOffsets(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  return (["-04:00", "-05:00"] as const).filter((offset) => {
    const instant = new Date(`${value}:00${offset}`);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        timeZone: "America/New_York",
        year: "numeric",
      })
        .formatToParts(instant)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return (
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` ===
      value
    );
  });
}

function emptyDraft(): EventFormValue {
  return {
    creationKey: crypto.randomUUID(),
    values: {
      audience: "public",
      description: "",
      end: "",
      internal: false,
      location: "",
      name: "",
      pointOverride: null,
      roleIds: [],
      start: "",
      tagId: "",
    },
  };
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-background/60 p-3 sm:p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 grid min-w-0 gap-4">{children}</div>
    </section>
  );
}

export function EventFormDialog({
  channels = [],
  initialValue,
  mode = "create",
  onOpenChange,
  onSubmit,
  open,
  roles = [],
  tags = [],
}: {
  channels?: EventChannelChoice[];
  initialValue?: EventFormValue | null;
  mode?: "create" | "duplicate" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: EventFormValue) => Promise<void> | void;
  open: boolean;
  roles?: { id: string; name: string }[];
  tags?: EventTagItem[];
}) {
  const [form, setForm] = useState<EventFormValue>(
    () => initialValue ?? emptyDraft(),
  );
  const [channelSearch, setChannelSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<EventCreateDraft | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previouslyOpen = useRef(false);

  useEffect(() => {
    if (open && !previouslyOpen.current) {
      setError(null);
      if (mode === "create") {
        const stored = loadEventCreateDraft(window.localStorage);
        setPendingDraft(stored);
        if (!stored) {
          setForm(initialValue ?? emptyDraft());
          setDirty(false);
        }
      } else {
        setPendingDraft(null);
        setForm(initialValue ?? emptyDraft());
        setDirty(false);
      }
    }
    previouslyOpen.current = open;
  }, [initialValue, mode, open]);

  useEffect(() => {
    if (!open || !dirty || mode !== "create") return;
    saveEventCreateDraft(window.localStorage, form);
  }, [dirty, form, mode, open]);

  function update<K extends keyof EventFormValue["values"]>(
    key: K,
    value: EventFormValue["values"][K],
  ) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      if (mode === "create") discardEventCreateDraft(window.localStorage);
      setDirty(false);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The event could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === "edit"
      ? "Edit event"
      : mode === "duplicate"
        ? "Duplicate event"
        : "Create event";
  const startOffsets = validNewYorkOffsets(form.values.start);
  const endOffsets = validNewYorkOffsets(form.values.end);
  const visibleChannels = channels.filter((channel) =>
    `${channel.name} ${channel.type}`
      .toLocaleLowerCase("en-US")
      .includes(channelSearch.trim().toLocaleLowerCase("en-US")),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={title}
        className="inset-0 left-0 top-0 h-[100svh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92svh] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center sm:[&>button]:h-8 sm:[&>button]:w-8"
      >
        <DialogHeader className="border-b border-border/70 bg-card/95 px-4 py-4 pr-16 text-left sm:px-6 sm:pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {mode === "duplicate" ? (
              <Copy className="h-5 w-5 text-primary" aria-hidden="true" />
            ) : (
              <CalendarPlus
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            Blade will publish this event after Discord and Google Calendar are
            ready.
          </DialogDescription>
        </DialogHeader>

        {pendingDraft && mode === "create" ? (
          <div className="grid min-h-0 flex-1 place-items-center p-4 sm:p-8">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-card/95 p-5 shadow-xl shadow-black/20">
              <h3 className="text-lg font-semibold">
                Restore unfinished event?
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This browser has event details that were not submitted.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => {
                    setForm(pendingDraft);
                    setPendingDraft(null);
                    setDirty(true);
                  }}
                >
                  Restore draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    discardEventCreateDraft(window.localStorage);
                    setPendingDraft(null);
                    setForm(emptyDraft());
                    setDirty(false);
                  }}
                >
                  Discard draft
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-w-0 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Event not saved</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormSection
                title="Event details"
                description="Use the plain event name. Blade adds the selected tag to provider titles."
              >
                <div className="grid gap-2">
                  <Label htmlFor="event-name">Event name</Label>
                  <Input
                    id="event-name"
                    value={form.values.name}
                    required
                    maxLength={100}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={form.values.description}
                    required
                    rows={4}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="event-tag">Tag</Label>
                    <select
                      id="event-tag"
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.values.tagId}
                      required
                      onChange={(event) => update("tagId", event.target.value)}
                    >
                      <option value="">Select a tag</option>
                      {tags
                        .filter((tag) => tag.active)
                        .map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name} · {tag.defaultPoints} points
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-points">Point override</Label>
                    <Input
                      id="event-points"
                      type="number"
                      min={0}
                      step={1}
                      value={form.values.pointOverride ?? ""}
                      placeholder="Use tag default"
                      onChange={(event) =>
                        update(
                          "pointOverride",
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Schedule & location"
                description="Times are shown in America/New_York. The end must be after the start."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="event-start">Starts</Label>
                    <Input
                      id="event-start"
                      type="datetime-local"
                      value={form.values.start}
                      required
                      onChange={(event) => {
                        update("start", event.target.value);
                        update("startOffset", undefined);
                      }}
                    />
                    {startOffsets.length > 1 && (
                      <select
                        aria-label="Start time occurrence"
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        required
                        value={form.values.startOffset ?? ""}
                        onChange={(event) =>
                          update(
                            "startOffset",
                            event.target.value as "-04:00" | "-05:00",
                          )
                        }
                      >
                        <option value="">
                          Choose repeated-time occurrence
                        </option>
                        <option value="-04:00">
                          First occurrence · UTC-04:00
                        </option>
                        <option value="-05:00">
                          Second occurrence · UTC-05:00
                        </option>
                      </select>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-end">Ends</Label>
                    <Input
                      id="event-end"
                      type="datetime-local"
                      value={form.values.end}
                      required
                      onChange={(event) => {
                        update("end", event.target.value);
                        update("endOffset", undefined);
                      }}
                    />
                    {endOffsets.length > 1 && (
                      <select
                        aria-label="End time occurrence"
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        required
                        value={form.values.endOffset ?? ""}
                        onChange={(event) =>
                          update(
                            "endOffset",
                            event.target.value as "-04:00" | "-05:00",
                          )
                        }
                      >
                        <option value="">
                          Choose repeated-time occurrence
                        </option>
                        <option value="-04:00">
                          First occurrence · UTC-04:00
                        </option>
                        <option value="-05:00">
                          Second occurrence · UTC-05:00
                        </option>
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={form.values.location}
                    required
                    onChange={(event) => update("location", event.target.value)}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Audience & destinations"
                description="Blade uses this audience for member eligibility. Internal controls calendar and Discord placement."
              >
                <div className="grid gap-2">
                  <Label htmlFor="event-audience">Audience</Label>
                  <select
                    id="event-audience"
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.values.audience}
                    onChange={(event) =>
                      update(
                        "audience",
                        event.target
                          .value as EventFormValue["values"]["audience"],
                      )
                    }
                  >
                    <option value="public">Public</option>
                    <option value="dues">Dues paying</option>
                    <option value="roles">Selected roles</option>
                  </select>
                </div>

                {form.values.audience === "roles" && (
                  <div className="grid gap-2">
                    <Label htmlFor="event-roles">Selected roles</Label>
                    <select
                      id="event-roles"
                      multiple
                      className="min-h-28 rounded-md border border-input bg-background p-2 text-sm"
                      value={form.values.roleIds}
                      onChange={(event) =>
                        update(
                          "roleIds",
                          Array.from(
                            event.target.selectedOptions,
                            (option) => option.value,
                          ),
                        )
                      }
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/10 bg-card/50 p-3">
                  <div>
                    <Label htmlFor="event-internal">Internal event</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use the internal calendar and a Discord voice or stage
                      channel.
                    </p>
                  </div>
                  <Switch
                    id="event-internal"
                    checked={form.values.internal}
                    onCheckedChange={(checked) => update("internal", checked)}
                  />
                </div>

                {form.values.internal && (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="event-channel-choice">
                        Available Discord channel
                      </Label>
                      <Input
                        type="search"
                        aria-label="Search Discord channels"
                        placeholder="Search voice and stage channels"
                        value={channelSearch}
                        onChange={(event) =>
                          setChannelSearch(event.target.value)
                        }
                      />
                      <select
                        id="event-channel-choice"
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        value={
                          channels.some(
                            (channel) => channel.id === form.values.channelId,
                          )
                            ? form.values.channelId
                            : ""
                        }
                        onChange={(event) => {
                          const channel = channels.find(
                            (candidate) => candidate.id === event.target.value,
                          );
                          if (!channel) return;
                          update("channelId", channel.id);
                          update("channelType", channel.type);
                        }}
                      >
                        <option value="">
                          Choose a live voice or stage channel
                        </option>
                        {visibleChannels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name} · {channel.type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="event-channel-id">
                          Manual Discord channel ID
                        </Label>
                        <Input
                          id="event-channel-id"
                          inputMode="numeric"
                          pattern="[0-9]{17,20}"
                          value={form.values.channelId ?? ""}
                          required
                          onChange={(event) =>
                            update("channelId", event.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="event-channel-type">Channel type</Label>
                        <select
                          id="event-channel-type"
                          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                          value={form.values.channelType ?? "voice"}
                          onChange={(event) =>
                            update(
                              "channelType",
                              event.target.value as "stage" | "voice",
                            )
                          }
                        >
                          <option value="voice">Voice</option>
                          <option value="stage">Stage</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {form.values.audience === "roles" && !form.values.internal && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Discord visibility is broader</AlertTitle>
                    <AlertDescription>
                      This event stays role-restricted in Blade, but its public
                      Discord event is visible to the guild.
                    </AlertDescription>
                  </Alert>
                )}
              </FormSection>
            </div>

            <DialogFooter className="sticky bottom-0 gap-2 border-t border-border/70 bg-card/95 p-3 sm:p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : title}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
