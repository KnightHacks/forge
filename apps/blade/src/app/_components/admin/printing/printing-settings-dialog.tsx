"use client";

import { useState, useTransition } from "react";
import { Settings } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type Configuration = RouterOutputs["printing"]["getConfiguration"];

const NO_CHANNEL = "none";

function toDateTimeLocal(date: Date | null) {
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value.trim() === "" ? null : new Date(value);
}

export function PrintingSettingsDialog({
  configuration,
  hackathonId,
}: {
  configuration: Configuration;
  hackathonId: string;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState(
    configuration.channelId ?? NO_CHANNEL,
  );
  const [printMinutes, setPrintMinutes] = useState(
    String(configuration.printMinutes),
  );
  const [printerCount, setPrinterCount] = useState(
    String(configuration.printerCount),
  );
  const [submissionsEnabled, setSubmissionsEnabled] = useState(
    configuration.submissions.enabled,
  );
  const [submissionsOpenAt, setSubmissionsOpenAt] = useState(
    toDateTimeLocal(configuration.submissions.openAt),
  );
  const [submissionsCloseAt, setSubmissionsCloseAt] = useState(
    toDateTimeLocal(configuration.submissions.closeAt),
  );

  // Loaded only while the dialog is open; listing channels calls Discord.
  const channels = api.printing.listDiscordChannels.useQuery(undefined, {
    enabled: open,
  });
  const setChannel = api.printing.setChannel.useMutation();
  const setEstimateSettings = api.printing.setEstimateSettings.useMutation();
  const setSubmissionWindow = api.printing.setSubmissionWindow.useMutation();
  const busy =
    setChannel.isPending ||
    setEstimateSettings.isPending ||
    setSubmissionWindow.isPending ||
    isRefreshing;

  async function save() {
    const nextChannel = channelId === NO_CHANNEL ? null : channelId;
    const minutes = Number(printMinutes);
    const printers = Number(printerCount);
    const openAt = fromDateTimeLocal(submissionsOpenAt);
    const closeAt = fromDateTimeLocal(submissionsCloseAt);
    try {
      if (nextChannel !== configuration.channelId) {
        await setChannel.mutateAsync({ channelId: nextChannel, hackathonId });
      }
      if (
        minutes !== configuration.printMinutes ||
        printers !== configuration.printerCount
      ) {
        await setEstimateSettings.mutateAsync({
          hackathonId,
          printMinutes: minutes,
          printerCount: printers,
        });
      }
      if (
        submissionsEnabled !== configuration.submissions.enabled ||
        (openAt?.getTime() ?? null) !==
          (configuration.submissions.openAt?.getTime() ?? null) ||
        (closeAt?.getTime() ?? null) !==
          (configuration.submissions.closeAt?.getTime() ?? null)
      ) {
        await setSubmissionWindow.mutateAsync({
          closeAt,
          enabled: submissionsEnabled,
          hackathonId,
          openAt,
        });
      }
      toast.success("Printing settings saved.");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Settings were not saved.",
      );
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setChannelId(configuration.channelId ?? NO_CHANNEL);
          setPrintMinutes(String(configuration.printMinutes));
          setPrinterCount(String(configuration.printerCount));
          setSubmissionsEnabled(configuration.submissions.enabled);
          setSubmissionsOpenAt(
            toDateTimeLocal(configuration.submissions.openAt),
          );
          setSubmissionsCloseAt(
            toDateTimeLocal(configuration.submissions.closeAt),
          );
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button className="min-h-11 gap-2" type="button" variant="outline">
          <Settings aria-hidden="true" className="size-4" />
          Printer settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-lg grid-cols-[minmax(0,1fr)] overflow-y-auto border-white/10 p-4 sm:p-6 [&>button]:size-11">
        <DialogHeader>
          <DialogTitle>Printing settings</DialogTitle>
          <DialogDescription>Saved for this hackathon only.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          id="printing-settings"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="rounded-md border border-white/10 bg-background/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="printing-submissions-enabled">
                  Accept new print jobs
                </Label>
                <p className="text-sm text-muted-foreground">
                  Hackers can only upload files and send new requests while this
                  is on and the optional window includes the current time.
                </p>
              </div>
              <Switch
                checked={submissionsEnabled}
                className="mt-1"
                id="printing-submissions-enabled"
                onCheckedChange={setSubmissionsEnabled}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="printing-open-at">Open time</Label>
                <Input
                  className="min-h-11"
                  id="printing-open-at"
                  onChange={(event) => setSubmissionsOpenAt(event.target.value)}
                  type="datetime-local"
                  value={submissionsOpenAt}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="printing-close-at">Close time</Label>
                <Input
                  className="min-h-11"
                  id="printing-close-at"
                  onChange={(event) =>
                    setSubmissionsCloseAt(event.target.value)
                  }
                  type="datetime-local"
                  value={submissionsCloseAt}
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Leave times blank for a manual on/off switch, or set one side for
              an open-ended block.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="printing-channel">New job channel</Label>
            <Select onValueChange={setChannelId} value={channelId}>
              <SelectTrigger className="min-h-11" id="printing-channel">
                <SelectValue
                  placeholder={
                    channels.isPending ? "Loading channels..." : "Choose"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANNEL}>No channel</SelectItem>
                {channels.data?.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </SelectItem>
                ))}
                {configuration.channelId &&
                !channels.data?.some(
                  (channel) => channel.id === configuration.channelId,
                ) ? (
                  <SelectItem value={configuration.channelId}>
                    Current channel ({configuration.channelId})
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              New jobs post here with the hacker's name and ping roles that have
              Printing Queue access. Use a channel only organizers can see.
            </p>
            {channels.isError ? (
              <p className="text-sm text-destructive dark:text-red-300">
                Discord channels could not be loaded.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="printing-minutes">Minutes per print</Label>
              <Input
                className="min-h-11"
                id="printing-minutes"
                inputMode="numeric"
                max={PRINTING.MAX_PRINT_MINUTES}
                min={PRINTING.MIN_PRINT_MINUTES}
                onChange={(event) => setPrintMinutes(event.target.value)}
                required
                step={1}
                type="number"
                value={printMinutes}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="printing-printers">Printers</Label>
              <Input
                className="min-h-11"
                id="printing-printers"
                inputMode="numeric"
                max={PRINTING.MAX_PRINTER_COUNT}
                min={PRINTING.MIN_PRINTER_COUNT}
                onChange={(event) => setPrinterCount(event.target.value)}
                required
                step={1}
                type="number"
                value={printerCount}
              />
            </div>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            Hackers see these in the print time notice and their ready-time
            estimates.
          </p>
        </form>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={busy}
            form="printing-settings"
            type="submit"
          >
            {busy ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
