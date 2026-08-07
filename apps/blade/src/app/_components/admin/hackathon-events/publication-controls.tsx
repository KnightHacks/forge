"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

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
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type ProviderHealth =
  RouterOutputs["hackathonEvent"]["getPublicationHealth"]["providers"][number];

const LABELS = { discord: "Discord", google: "Google" } as const;
const STATUS_LABELS = {
  blocked: "Blocked",
  degraded: "Degraded",
  off: "Off",
  on: "On",
  publishing: "Publishing",
  removing: "Removing",
} as const;

function statusText(provider: ProviderHealth) {
  if (provider.status === "publishing" || provider.status === "removing") {
    return (
      STATUS_LABELS[provider.status] +
      " " +
      provider.counts.converged +
      "/" +
      provider.counts.total
    );
  }
  return STATUS_LABELS[provider.status];
}

function badgeVariant(provider: ProviderHealth) {
  if (provider.status === "on") return "default" as const;
  if (provider.status === "degraded" || provider.status === "blocked") {
    return "destructive" as const;
  }
  return "secondary" as const;
}

function PublicationProgress({ provider }: { provider: ProviderHealth }) {
  if (provider.status !== "publishing" && provider.status !== "removing") {
    return null;
  }

  const total = provider.counts.total;
  const complete = Math.min(provider.counts.converged, total);
  const percent = total === 0 ? 0 : Math.round((complete / total) * 100);

  return (
    <div
      aria-label={`${LABELS[provider.provider]} publication progress`}
      aria-valuemax={Math.max(total, 1)}
      aria-valuemin={0}
      aria-valuenow={total === 0 ? undefined : complete}
      aria-valuetext={
        total === 0 ? "Preparing events" : `${complete} of ${total} events`
      }
      className="h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-28"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function PublicationControls({
  canEdit,
  hackathonId,
  hackathonName,
}: {
  canEdit: boolean;
  hackathonId: string;
  hackathonName: string;
}) {
  const utils = api.useUtils();
  const [disabling, setDisabling] = useState<ProviderHealth | null>(null);
  const health = api.hackathonEvent.getPublicationHealth.useQuery(
    { hackathonId },
    {
      refetchInterval(query) {
        const providers = query.state.data?.providers ?? [];
        return providers.some(({ status }) =>
          ["publishing", "removing"].includes(status),
        )
          ? 2_000
          : false;
      },
    },
  );
  const setDesired = api.hackathonEvent.setPublicationDesiredState.useMutation({
    onError(error) {
      if (error.data?.code === "CONFLICT") {
        setDisabling(null);
        toast.error("Publication changed. The latest status has been loaded.");
      } else {
        toast.error(error.message);
      }
      void utils.hackathonEvent.getPublicationHealth.invalidate({
        hackathonId,
      });
    },
    onSuccess(result) {
      utils.hackathonEvent.getPublicationHealth.setData(
        { hackathonId },
        result,
      );
    },
  });
  const retry = api.hackathonEvent.retryPublication.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess(result) {
      utils.hackathonEvent.getPublicationHealth.setData(
        { hackathonId },
        result,
      );
      toast.success("Publication retry queued.");
    },
  });

  async function update(provider: ProviderHealth, desiredEnabled: boolean) {
    await setDesired.mutateAsync({
      desiredEnabled,
      expectedRevision: provider.revision,
      hackathonId,
      provider: provider.provider,
      ...(desiredEnabled
        ? {}
        : { expectedRemoteCount: provider.counts.remote }),
    });
    setDisabling(null);
    toast.success(
      LABELS[provider.provider] +
        " publication " +
        (desiredEnabled ? "enabled." : "disabled."),
    );
  }

  if (health.isPending) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Calendar publication
      </div>
    );
  }
  if (health.isError) {
    return (
      <Button
        className="min-h-11 gap-2"
        onClick={() => health.refetch()}
        variant="outline"
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
        Retry calendar status
      </Button>
    );
  }

  return (
    <>
      <div
        aria-label="External calendar publication"
        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-input bg-background/70 px-3 py-1.5"
      >
        {health.data.providers.map((provider) => {
          const busy =
            setDesired.isPending ||
            provider.status === "publishing" ||
            provider.status === "removing";
          const status = (
            <Badge variant={badgeVariant(provider)}>
              {busy ? (
                <Loader2
                  className="mr-1 size-3 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {statusText(provider)}
            </Badge>
          );
          return (
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1"
              key={provider.provider}
            >
              <Switch
                aria-label={LABELS[provider.provider] + " calendar publication"}
                checked={provider.desiredEnabled}
                disabled={!canEdit || setDesired.isPending}
                onCheckedChange={(checked) => {
                  if (checked) void update(provider, true);
                  else setDisabling(provider);
                }}
              />
              <span className="text-sm font-medium">
                {LABELS[provider.provider]}
              </span>
              {provider.issues.length ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="min-h-11" type="button">
                      {status}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 space-y-3">
                    <div>
                      <p className="font-medium">
                        {LABELS[provider.provider]} needs attention
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Forge events remain available while this is repaired.
                      </p>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {provider.issues.map((issue) => (
                        <div
                          className="rounded-md border border-border/70 p-2 text-sm"
                          key={issue.eventId}
                        >
                          <p className="font-medium">{issue.eventName}</p>
                          <p className="break-words text-xs text-muted-foreground">
                            {issue.lastError ??
                              (issue.state === "blocked"
                                ? "Discord outcome is ambiguous and needs manual resolution."
                                : "Retry is queued.")}
                          </p>
                        </div>
                      ))}
                    </div>
                    {canEdit ? (
                      <Button
                        className="min-h-10 w-full gap-2"
                        disabled={retry.isPending}
                        onClick={() =>
                          retry.mutate({
                            hackathonId,
                            provider: provider.provider,
                          })
                        }
                        variant="outline"
                      >
                        {retry.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                        Retry safe failures
                      </Button>
                    ) : null}
                  </PopoverContent>
                </Popover>
              ) : (
                status
              )}
              <PublicationProgress provider={provider} />
            </div>
          );
        })}
      </div>

      <Dialog
        onOpenChange={(open) => !open && setDisabling(null)}
        open={disabling !== null}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Disable {disabling ? LABELS[disabling.provider] : "calendar"}{" "}
              publication?
            </DialogTitle>
            <DialogDescription>
              Forge will remove {disabling?.counts.remote.toLocaleString() ?? 0}{" "}
              published events for {hackathonName}. Event records, attendance,
              points, and hacker schedule data remain in Forge.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={setDesired.isPending}
              onClick={() => setDisabling(null)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={!disabling || setDesired.isPending}
              onClick={() => disabling && void update(disabling, false)}
              variant="destructive"
            >
              {setDesired.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Disable and remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
