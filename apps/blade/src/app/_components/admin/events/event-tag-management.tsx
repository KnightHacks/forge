"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Archive, Pencil, Plus } from "lucide-react";

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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { toast } from "@forge/ui/toast";

import type { EventTagItem, EventTagValues } from "./types";
import { EventTag } from "./event-presenters";

const EMPTY_TAG: EventTagValues = {
  color: "#7C3AED",
  defaultPoints: 0,
  name: "",
  emoji: null,
  announcementChannelId: null,
  skipNextWeek: false,
};

interface TagAnnouncementProps {
  channels: { id: string; name: string }[];
  channelsLoading?: boolean;
  channelsError?: string;
  onRetryChannels?: () => void;
  showSkipNextWeek: boolean;
}

function TagAnnouncementFields({
  channels,
  channelsLoading,
  channelsError,
  onRetryChannels,
  showSkipNextWeek,
  values,
  onChange,
}: TagAnnouncementProps & {
  values: EventTagValues;
  onChange: (changes: Partial<EventTagValues>) => void;
}) {
  const missingChannel =
    values.announcementChannelId &&
    !channels.some(({ id }) => id === values.announcementChannelId)
      ? {
          id: values.announcementChannelId,
          name: `Current channel (${values.announcementChannelId})`,
        }
      : null;
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="tag-emoji">Announcement emoji</Label>
        <Input
          id="tag-emoji"
          className="min-h-11"
          aria-describedby="tag-emoji-help"
          value={values.emoji ?? ""}
          maxLength={32}
          placeholder="🛠️"
          onChange={(event) =>
            onChange({ emoji: event.target.value.trim() || null })
          }
        />
        <p id="tag-emoji-help" className="text-sm text-muted-foreground">
          Appears before event titles. Leave blank for no emoji.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tag-announcement-channel">
          Announcement channel override (optional)
        </Label>
        <ResponsiveComboBox
          ariaLabel="Announcement channel override (optional)"
          triggerId="tag-announcement-channel"
          triggerClassName="h-auto min-h-11 min-w-0 whitespace-normal break-all text-left"
          isLoading={channelsLoading}
          buttonPlaceholder="Use default channel"
          inputPlaceholder="Search channels"
          emptyMessage="No channels found."
          items={[
            { id: "default", name: "Use default channel" },
            ...(missingChannel ? [missingChannel] : []),
            ...channels,
          ]}
          value={values.announcementChannelId ?? "default"}
          getItemValue={(channel) => channel.id}
          getItemLabel={(channel) =>
            channel.id === "default" || channel.id === missingChannel?.id
              ? channel.name
              : `#${channel.name}`
          }
          getItemSearchValue={(channel) => channel.name}
          renderItem={(channel) => (
            <span className="break-all">
              {channel.id === "default" || channel.id === missingChannel?.id
                ? channel.name
                : `#${channel.name}`}
            </span>
          )}
          onValueChange={(value) =>
            onChange({
              announcementChannelId: value === "default" ? null : value,
            })
          }
        />
        <p className="text-sm text-muted-foreground">
          Without an override, this tag uses the default announcement channel.
        </p>
        {channelsLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading channels…
          </p>
        ) : channelsError ? (
          <div role="alert" className="text-sm text-destructive">
            <p>{channelsError}</p>
            {onRetryChannels && (
              <Button
                type="button"
                variant="outline"
                className="mt-2 min-h-11"
                onClick={onRetryChannels}
              >
                Retry channels
              </Button>
            )}
          </div>
        ) : missingChannel ? (
          <p role="status" className="text-sm text-muted-foreground">
            This channel is unavailable. Choose another channel or use the
            default.
          </p>
        ) : null}
      </div>
      {showSkipNextWeek && (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
          <Checkbox
            id="tag-skip-next-week"
            aria-describedby="tag-skip-next-week-help"
            checked={values.skipNextWeek ?? false}
            onCheckedChange={(checked) =>
              onChange({ skipNextWeek: checked === true })
            }
          />
          <Label
            className="flex min-h-11 items-center"
            htmlFor="tag-skip-next-week"
          >
            Skip Next Week reminders
          </Label>
          <p
            id="tag-skip-next-week-help"
            className="col-start-2 text-sm text-muted-foreground"
          >
            Still include this tag in Sunday, Today, and Tomorrow announcements.
          </p>
        </div>
      )}
    </>
  );
}

function TagEditor({
  channels,
  channelsLoading,
  channelsError,
  onRetryChannels,
  showSkipNextWeek,
  initial,
  onClose,
  onSave,
}: TagAnnouncementProps & {
  initial: EventTagValues;
  onClose: () => void;
  onSave: (values: EventTagValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-2rem)] bg-card p-4 sm:p-6"
        aria-label={initial.name ? "Edit event tag" : "Create event tag"}
      >
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            Points and color default for new events. Announcement settings apply
            to all events using this tag.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            try {
              const { skipNextWeek, ...shared } = values;
              await onSave(
                showSkipNextWeek ? { ...shared, skipNextWeek } : shared,
              );
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "The event tag could not be saved.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              className="min-h-11"
              value={values.name}
              required
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tag-points">Default points</Label>
              <Input
                id="tag-points"
                className="min-h-11"
                type="number"
                min={0}
                step={1}
                value={values.defaultPoints}
                required
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    defaultPoints: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag-color">Color</Label>
              <Input
                id="tag-color"
                className="min-h-11"
                type="color"
                value={values.color}
                required
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <TagAnnouncementFields
            channels={channels}
            channelsLoading={channelsLoading}
            channelsError={channelsError}
            onRetryChannels={onRetryChannels}
            showSkipNextWeek={showSkipNextWeek}
            values={values}
            onChange={(changes) =>
              setValues((current) => ({ ...current, ...changes }))
            }
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              className="min-h-11"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? "Saving..." : "Save tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EventTagManagement({
  description = "Manage event labels, defaults, and announcements.",
  channels = [],
  channelsLoading,
  channelsError,
  onRetryChannels,
  showSkipNextWeek = true,
  headerActions,
  onArchive,
  onCreate,
  onUpdate,
  tags,
}: {
  description?: string;
  channels?: { id: string; name: string }[];
  channelsLoading?: boolean;
  channelsError?: string;
  onRetryChannels?: () => void;
  showSkipNextWeek?: boolean;
  headerActions?: ReactNode;
  onArchive?: (tagId: string) => Promise<void> | void;
  onCreate?: (values: EventTagValues) => Promise<void> | void;
  onUpdate?: (tagId: string, values: EventTagValues) => Promise<void> | void;
  tags: EventTagItem[];
}) {
  const [editing, setEditing] = useState<EventTagItem | "new" | null>(null);
  const [archivePendingId, setArchivePendingId] = useState<string | null>(null);

  async function archive(tag: EventTagItem) {
    if (!onArchive || archivePendingId) return;
    setArchivePendingId(tag.id);
    try {
      await onArchive(tag.id);
    } catch (cause) {
      toast.error(
        cause instanceof Error && cause.message
          ? cause.message
          : `The ${tag.name} tag could not be archived.`,
      );
    } finally {
      setArchivePendingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">Event tags</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {headerActions}
          <Button
            type="button"
            className="min-h-11 gap-2"
            onClick={() => setEditing("new")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create tag
          </Button>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:p-5">
        {tags.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            No event tags have been configured.
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                {tag.emoji && <span aria-hidden="true">{tag.emoji}</span>}
                <EventTag color={tag.color} name={tag.name} />
                {tag.announcementChannelId && (
                  <Badge variant="outline" className="break-all text-sm">
                    #
                    {channels.find(
                      (channel) => channel.id === tag.announcementChannelId,
                    )?.name ?? tag.announcementChannelId}
                  </Badge>
                )}
                {showSkipNextWeek && tag.skipNextWeek && (
                  <Badge variant="outline" className="text-sm">
                    Skips Next Week
                  </Badge>
                )}
                <span className="font-mono text-sm">
                  {tag.defaultPoints} points
                </span>
                {!tag.active && <Badge variant="secondary">Archived</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-auto min-h-11 whitespace-normal text-left text-sm"
                  variant="outline"
                  onClick={() => setEditing(tag)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit {tag.name}
                </Button>
                {tag.active && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-auto min-h-11 whitespace-normal text-left text-sm"
                    variant="outline"
                    disabled={archivePendingId !== null}
                    onClick={() => void archive(tag)}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    {archivePendingId === tag.id
                      ? "Archiving..."
                      : "Archive"}{" "}
                    {tag.name}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <TagEditor
          channels={channels}
          channelsLoading={channelsLoading}
          channelsError={channelsError}
          onRetryChannels={onRetryChannels}
          showSkipNextWeek={showSkipNextWeek}
          initial={
            editing === "new"
              ? EMPTY_TAG
              : {
                  emoji: editing.emoji ?? null,
                  announcementChannelId: editing.announcementChannelId ?? null,
                  skipNextWeek: editing.skipNextWeek ?? false,
                  color: editing.color,
                  defaultPoints: editing.defaultPoints,
                  name: editing.name,
                }
          }
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (editing === "new") await onCreate?.(values);
            else await onUpdate?.(editing.id, values);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
