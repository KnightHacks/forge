"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, Loader2 } from "lucide-react";

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
import { Skeleton } from "@forge/ui/skeleton";
import { toast } from "@forge/ui/toast";

import { EventTag } from "~/app/_components/admin/events/event-presenters";
import { api } from "~/trpc/react";

export function HackathonTagImportDialog({
  hackathonId,
  onImported,
}: {
  hackathonId: string;
  onImported: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const preview = api.hackathonEvent.previewTagImport.useQuery(
    { hackathonId },
    { enabled: open },
  );
  const importTags = api.hackathonEvent.importTags.useMutation();

  async function confirm() {
    try {
      const result = await importTags.mutateAsync({ hackathonId });
      toast.success(
        result.imported.length === 1
          ? "1 event tag imported."
          : `${result.imported.length} event tags imported.`,
      );
      setOpen(false);
      await onImported();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Tags could not be imported.",
      );
    }
  }

  return (
    <>
      <Button
        className="min-h-11 gap-2"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <ArrowDownToLine className="size-4" aria-hidden="true" />
        Import previous tags
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-h-[90svh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import previous hackathon tags</DialogTitle>
            <DialogDescription>
              Review every tag used before this hackathon. Existing names stay
              unchanged, and tags that were only archived stay archived.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border/70 [scrollbar-gutter:stable]">
            {preview.isPending ? (
              <div
                aria-label="Previous hackathon tags loading"
                aria-busy="true"
                className="divide-y divide-border/70"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    key={index}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-28 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-64 max-w-full" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : preview.isError ? (
              <p className="p-6 text-sm text-destructive">
                {preview.error.message}
              </p>
            ) : preview.data.tags.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No tags were found in earlier hackathons.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {preview.data.tags.map((tag) => (
                  <li
                    className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    key={tag.normalizedName}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <EventTag color={tag.color} name={tag.name} />
                        <span className="font-mono text-sm text-muted-foreground">
                          {tag.defaultPoints} points
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Latest: {tag.sourceHackathon.displayName}
                        {tag.alsoSeenIn.length > 1
                          ? ` · seen in ${tag.alsoSeenIn.length} prior hacks`
                          : ""}
                      </p>
                      {tag.alsoSeenIn.length > 1 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Used in:{" "}
                          {tag.alsoSeenIn
                            .map(
                              (source) =>
                                `${source.displayName}${source.active ? "" : " (archived)"}`,
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    {tag.status === "will_import" ? (
                      <Badge className="gap-1" variant="secondary">
                        <Check className="size-3" aria-hidden="true" /> Import
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {tag.status === "archived_source"
                          ? "Archived previously · skip"
                          : tag.status === "already_exists_archived"
                            ? "Archived in target · skip"
                            : "Already in target · skip"}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {preview.data ? (
            <p className="text-sm text-muted-foreground">
              {preview.data.counts.sourceTagRows} tag records across{" "}
              {preview.data.counts.sourceHackathons} prior hackathons ·{" "}
              {preview.data.counts.willImport} new ·{" "}
              {preview.data.counts.alreadyExists} skipped
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              disabled={importTags.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={
                importTags.isPending ||
                preview.isPending ||
                preview.isError ||
                preview.data.counts.willImport === 0
              }
              onClick={() => void confirm()}
              type="button"
            >
              {importTags.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowDownToLine className="size-4" aria-hidden="true" />
              )}
              Import {preview.data?.counts.willImport ?? 0} tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
