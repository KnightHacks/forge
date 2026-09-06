"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, BellRing, X } from "lucide-react";
import { createPortal } from "react-dom";

import type { RouterOutputs } from "@forge/api";
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

import { api } from "~/trpc/react";

type Announcement = RouterOutputs["judging"]["listAnnouncements"][number];

const DISMISSED_KEY = "forge-judging-announcements-dismissed";
const subscribeToNothing = () => () => undefined;

function scopeLabel(announcement: Announcement) {
  return announcement.roomName ?? "All judging rooms";
}

function readDismissed() {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(DISMISSED_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(value)
      ? new Set(value.filter((id): id is string => typeof id === "string"))
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function JudgingAnnouncements({
  hackathonId,
  initialAnnouncements,
}: {
  hackathonId?: string;
  initialAnnouncements: Announcement[];
}) {
  const [dismissedThisMount, setDismissedThisMount] = useState<Set<string>>(
    new Set(),
  );
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const query = api.judging.listAnnouncements.useQuery(
    { hackathonId },
    {
      refetchInterval: 30_000,
      refetchIntervalInBackground: true,
    },
  );
  const announcements = query.data ?? initialAnnouncements;
  const dismissed = useMemo(() => {
    if (!mounted) return dismissedThisMount;
    return new Set([...readDismissed(), ...dismissedThisMount]);
  }, [dismissedThisMount, mounted]);

  function dismiss(id: string) {
    setDismissedThisMount((current) => {
      const next = new Set([...readDismissed(), ...current]);
      next.add(id);
      const ids = [...next].slice(-100);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
      return new Set(ids);
    });
  }

  const visible = announcements.filter(
    (announcement) => !dismissed.has(announcement.id),
  );
  const urgent = visible.find((announcement) => announcement.isUrgent);
  const banners = visible.filter((announcement) => !announcement.isUrgent);
  const bannerLayer = banners.length ? (
    <div
      aria-label="Judging announcements"
      className="pointer-events-none fixed inset-x-3 top-3 z-[200] mx-auto max-w-3xl"
    >
      <div className="pointer-events-auto flex max-h-[calc(100svh-1.5rem)] flex-col gap-2 overflow-y-auto overscroll-contain">
        {banners.map((announcement) => (
          <section
            className="overflow-hidden rounded-lg border border-[#DBC049]/45 bg-[#17140a]/95 shadow-2xl shadow-black/45 backdrop-blur"
            key={announcement.id}
            role="status"
          >
            <div className="h-1 bg-[#DBC049]" />
            <div className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#DBC049]/15 text-[#DBC049]">
                <BellRing className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Judging announcement</p>
                  <Badge
                    className="border-[#DBC049]/35 text-[#DBC049]"
                    variant="outline"
                  >
                    {scopeLabel(announcement)}
                  </Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/85">
                  {announcement.message}
                </p>
              </div>
              <Button
                aria-label={`Dismiss announcement for ${scopeLabel(announcement)}`}
                className="size-11 shrink-0 text-white/75 hover:text-white"
                onClick={() => dismiss(announcement.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {mounted && bannerLayer
        ? createPortal(bannerLayer, document.body)
        : bannerLayer}

      <Dialog
        onOpenChange={(open) => {
          if (!open && urgent) dismiss(urgent.id);
        }}
        open={!!urgent}
      >
        <DialogContent
          className="z-[210] max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] overflow-y-auto border-destructive/55 p-0 sm:max-w-xl"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          portalled={mounted}
          showCloseButton={false}
        >
          {urgent ? (
            <>
              <div className="h-1.5 bg-destructive" />
              <div className="space-y-5 p-6 pt-4">
                <DialogHeader className="text-left">
                  <div className="bg-destructive/12 mb-2 flex size-12 items-center justify-center rounded-full text-destructive">
                    <AlertTriangle className="size-6" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle>Urgent judging announcement</DialogTitle>
                    <Badge variant="destructive">{scopeLabel(urgent)}</Badge>
                  </div>
                  <DialogDescription className="whitespace-pre-wrap break-words pt-2 text-base leading-7 text-foreground">
                    {urgent.message}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    className="h-11 w-full sm:w-auto"
                    onClick={() => dismiss(urgent.id)}
                    type="button"
                    variant="destructive"
                  >
                    I understand
                  </Button>
                </DialogFooter>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
