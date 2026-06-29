"use client";

import { useState } from "react";
import { Archive, Pencil, Plus } from "lucide-react";

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
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import type { EventTagItem } from "./types";
import { EventTag } from "./event-presenters";

interface TagValues {
  color: string;
  defaultPoints: number;
  name: string;
}

const EMPTY_TAG: TagValues = {
  color: "#7C3AED",
  defaultPoints: 0,
  name: "",
};

function TagEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: TagValues;
  onClose: () => void;
  onSave: (values: TagValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-label={initial.name ? "Edit event tag" : "Create event tag"}
      >
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            Defaults apply when officers create future events.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            try {
              await onSave(values);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
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
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EventTagManagement({
  onArchive,
  onCreate,
  onUpdate,
  tags,
}: {
  onArchive?: (tagId: string) => Promise<void> | void;
  onCreate?: (values: TagValues) => Promise<void> | void;
  onUpdate?: (tagId: string, values: TagValues) => Promise<void> | void;
  tags: EventTagItem[];
}) {
  const [editing, setEditing] = useState<EventTagItem | "new" | null>(null);

  return (
    <section className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">Event tags</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the label, color, and default points for future club events.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 gap-2"
          onClick={() => setEditing("new")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create tag
        </Button>
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
                <EventTag color={tag.color} name={tag.name} />
                <span className="font-mono text-sm">
                  {tag.defaultPoints} points
                </span>
                {!tag.active && <Badge variant="secondary">Archived</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(tag)}
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Edit {tag.name}
                </Button>
                {tag.active && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onArchive?.(tag.id)}
                  >
                    <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                    Archive {tag.name}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <TagEditor
          initial={
            editing === "new"
              ? EMPTY_TAG
              : {
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
