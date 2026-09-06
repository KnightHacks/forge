"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  DoorOpen,
  ExternalLink,
  Hash,
  KeyRound,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  ShieldAlert,
  UserRoundX,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type ControlData = RouterOutputs["judging"]["listAdmin"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];
type Room = ControlData["rooms"][number];
type Announcement = NonNullable<ControlData["globalAnnouncement"]>;
type QrResult = Pick<
  RouterOutputs["judging"]["generateRoomLink"],
  "id" | "qrCodeUrl" | "url"
>;

const ACTIVE_PRESENCE_WINDOW_MS = 2 * 60 * 1000;

function formString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function isActivePresence(lastSeenAt: Date) {
  return Date.now() - lastSeenAt.getTime() <= ACTIVE_PRESENCE_WINDOW_MS;
}

function printRoomQr(roomName: string, qrCodeUrl: string) {
  const printWindow = window.open(
    "",
    "forge-judging-room-qr",
    "popup,width=720,height=900",
  );
  if (!printWindow) {
    toast.error("Allow pop-ups to print this room QR.");
    return;
  }

  printWindow.opener = null;
  const { document } = printWindow;
  document.title = `${roomName} judging QR`;

  const style = document.createElement("style");
  style.textContent = `
    @page { margin: 0.5in; }
    body { margin: 0; color: #111; background: #fff; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { min-height: 9in; display: grid; place-content: center; justify-items: center; gap: 16px; text-align: center; }
    .eyebrow { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: 34px; line-height: 1.15; }
    .instruction { max-width: 32rem; margin: 0; font-size: 18px; line-height: 1.5; }
    img { width: 5.5in; max-width: 100%; height: auto; image-rendering: crisp-edges; }
  `;
  document.head.append(style);

  const main = document.createElement("main");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Knight Hacks judging";
  const title = document.createElement("h1");
  title.textContent = roomName;
  const instruction = document.createElement("p");
  instruction.className = "instruction";
  instruction.textContent = "Scan to enter this judging room.";
  const image = document.createElement("img");
  image.alt = `Guest judge QR for ${roomName}`;
  image.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
    },
    { once: true },
  );
  image.src = qrCodeUrl;
  main.append(eyebrow, title, instruction, image);
  document.body.append(main);
  printWindow.addEventListener("afterprint", () => printWindow.close(), {
    once: true,
  });
}

function RoomEditor({
  data,
  onOpenChange,
  onSaved,
  room,
}: {
  data: ControlData;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  room: Room | "new" | null;
}) {
  const create = api.judging.createRoom.useMutation();
  const update = api.judging.updateRoom.useMutation();
  const [challengeId, setChallengeId] = useState(
    room && room !== "new" ? room.challengeId : (data.challenges[0]?.id ?? ""),
  );
  const challengeChanges =
    room && room !== "new" && room.challengeId !== challengeId;
  const requiresConfirmation =
    room && room !== "new" && room.activeLinkId && challengeChanges;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = formString(form.get("name"));
    const confirmation = formString(form.get("confirmation"));
    try {
      if (room === "new") {
        await create.mutateAsync({
          challengeId,
          hackathonId: data.hackathon.id,
          name,
        });
        toast.success("Judging room created.");
      } else if (room) {
        await update.mutateAsync({
          challengeId,
          confirmation: confirmation || undefined,
          name,
          roomId: room.id,
        });
        toast.success(
          requiresConfirmation
            ? "Room updated and guest access revoked."
            : "Room updated.",
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Room save failed.");
    }
  }

  return (
    <Dialog open={room !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form className="space-y-5" onSubmit={submit}>
          <DialogHeader className="text-left">
            <DialogTitle>
              {room === "new" ? "Create judging room" : "Edit judging room"}
            </DialogTitle>
            <DialogDescription>
              Each room has one default challenge. Several rooms may share the
              same challenge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="judging-room-name">Room name</Label>
            <Input
              defaultValue={room && room !== "new" ? room.name : ""}
              id="judging-room-name"
              maxLength={120}
              name="name"
              placeholder="Sponsor suite A"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judging-room-challenge">Challenge</Label>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="judging-room-challenge"
              onChange={(event) => setChallengeId(event.target.value)}
              required
              value={challengeId}
            >
              {data.challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.label}
                </option>
              ))}
            </select>
            {data.challenges.find((item) => item.id === challengeId)?.label ===
            "General" ? (
              <p className="text-xs leading-5 text-muted-foreground">
                General guest judges can browse every imported project.
              </p>
            ) : null}
          </div>
          {requiresConfirmation ? (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertTitle>This revokes the room QR</AlertTitle>
              <AlertDescription>
                Changing the challenge ends every guest session from the current
                QR. Type <strong>{room.name}</strong> to continue.
              </AlertDescription>
              <Input
                aria-label="Confirm room name"
                className="mt-3"
                name="confirmation"
                required
              />
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={create.isPending || update.isPending}
              type="submit"
            >
              {create.isPending || update.isPending ? "Saving…" : "Save room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomQrDialog({
  onOpenChange,
  qr,
  roomName,
}: {
  onOpenChange: (open: boolean) => void;
  qr: QrResult | null;
  roomName: string;
}) {
  return (
    <Dialog open={qr !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{roomName} access</DialogTitle>
          <DialogDescription>
            Display or print this QR at the room entrance. It remains valid
            until an officer revokes or rotates it.
          </DialogDescription>
        </DialogHeader>
        {qr ? (
          <div className="space-y-4">
            <div className="mx-auto w-fit rounded-lg border border-border bg-white p-3">
              <Image
                alt={`Guest judge QR for ${roomName}`}
                height={512}
                src={qr.qrCodeUrl}
                unoptimized
                width={512}
                className="size-64 max-w-full"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="gap-2"
                onClick={() => printRoomQr(roomName, qr.qrCodeUrl)}
                variant="outline"
              >
                <Printer className="size-4" aria-hidden="true" /> Print QR
              </Button>
              <Button
                className="gap-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(qr.url);
                    toast.success("Room link copied.");
                  } catch {
                    toast.error("Room link could not be copied.");
                  }
                }}
                variant="outline"
              >
                <Copy className="size-4" aria-hidden="true" /> Copy room link
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface AnnouncementDialogProps {
  current: Announcement | null;
  data: ControlData;
  onClose: () => void;
  onSaved: () => void;
  room: Room | null;
}

export function AnnouncementDialog(props: AnnouncementDialogProps) {
  return (
    <AnnouncementDialogContent
      key={props.current?.id ?? "new-announcement"}
      {...props}
    />
  );
}

function AnnouncementDialogContent({
  current,
  data,
  onClose,
  onSaved,
  room,
}: AnnouncementDialogProps) {
  const publish = api.judging.publishAnnouncement.useMutation();
  const clear = api.judging.clearAnnouncement.useMutation();
  const [includeGuests, setIncludeGuests] = useState(
    current?.includeGuests ?? false,
  );
  const [isUrgent, setIsUrgent] = useState(current?.isUrgent ?? false);
  const [message, setMessage] = useState(current?.message ?? "");
  const scope = room?.name ?? "All judging rooms";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await publish.mutateAsync({
        hackathonId: data.hackathon.id,
        includeGuests,
        isUrgent,
        message,
        roomId: room?.id ?? null,
      });
      if (result.discordDelivery === "failed") {
        toast.error(
          "Announcement published in Blade, but Discord delivery failed.",
        );
      } else if (result.discordDelivery === "not_configured") {
        toast.success(
          "Announcement published in Blade. Discord is not connected.",
        );
      } else if (result.discordDelivery === "superseded") {
        toast.success(
          "Announcement published in Blade, then replaced before Discord delivery.",
        );
      } else {
        toast.success("Announcement published in Blade and Discord.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Announcement could not be published.",
      );
    }
  }

  async function clearCurrent() {
    if (!current) return;
    try {
      await clear.mutateAsync({ announcementId: current.id });
      toast.success("Announcement cleared.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Announcement could not be cleared.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] overflow-y-auto sm:max-w-xl [&>button]:size-11">
        <form className="space-y-5" onSubmit={submit}>
          <DialogHeader className="text-left">
            <div className="mb-1 flex size-11 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <Megaphone className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle>
              {current ? "Replace announcement" : "Publish announcement"}
            </DialogTitle>
            <DialogDescription>
              This goes to {scope} in Blade and Discord. Blade publication
              succeeds even if Discord is unavailable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="judging-announcement-message">Message</Label>
            <Textarea
              id="judging-announcement-message"
              maxLength={1000}
              name="message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Judging pauses at 4:30 PM for deliberation."
              required
              rows={5}
              value={message}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Authenticated judges receive a Discord mention. Guest judges are
              never mentioned on Discord.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-4">
            <Label
              className="flex min-h-11 cursor-pointer items-start justify-between gap-4"
              htmlFor="judging-announcement-guests"
            >
              <span>
                <span className="block font-medium">Include guest judges</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">
                  Show this in the QR guest workspace too.
                </span>
              </span>
              <Switch
                checked={includeGuests}
                id="judging-announcement-guests"
                onCheckedChange={setIncludeGuests}
              />
            </Label>
            <Label
              className="flex min-h-11 cursor-pointer items-start justify-between gap-4 border-t border-border/60 pt-3"
              htmlFor="judging-announcement-urgent"
            >
              <span>
                <span className="block font-medium">Urgent announcement</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">
                  Block judging until each recipient acknowledges the message.
                </span>
              </span>
              <Switch
                checked={isUrgent}
                id="judging-announcement-urgent"
                onCheckedChange={setIsUrgent}
              />
            </Label>
          </div>

          {current ? (
            <div className="bg-[#DBC049]/8 rounded-md border border-[#DBC049]/30 px-4 py-3 text-sm">
              A current {current.isUrgent ? "urgent dialog" : "banner"} is live
              for {scope}. Publishing replaces it immediately.
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {current ? (
              <Button
                className="min-h-11"
                disabled={clear.isPending || publish.isPending}
                onClick={() => void clearCurrent()}
                type="button"
                variant="outline"
              >
                {clear.isPending ? "Clearing…" : "Clear current"}
              </Button>
            ) : null}
            <Button
              className="min-h-11"
              disabled={clear.isPending || publish.isPending}
              type="submit"
            >
              {publish.isPending
                ? "Publishing…"
                : current
                  ? "Replace announcement"
                  : "Publish announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JudgingControlPanel({
  initialData,
  hackathons,
  embedded = false,
}: {
  initialData: ControlData;
  hackathons: Hackathons;
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [qr, setQr] = useState<{ roomName: string; value: QrResult } | null>(
    null,
  );
  const [archiving, setArchiving] = useState<Room | null>(null);
  const [announcementRoom, setAnnouncementRoom] = useState<
    Room | null | "global"
  >(null);
  const [commsDraft, setCommsDraft] = useState({
    channelId: initialData.configuration.judgingCommsChannelId,
    hackathonId: initialData.hackathon.id,
  });
  const query = api.judging.listAdmin.useQuery(
    { hackathonId: initialData.hackathon.id },
    { initialData, refetchInterval: 10_000 },
  );
  const generate = api.judging.generateRoomLink.useMutation();
  const channels = api.judging.listDiscordChannels.useQuery();
  const saveComms = api.judging.setCommsChannel.useMutation();
  const retryThreads = api.judging.provisionRoomThreads.useMutation();
  const sendQr = api.judging.sendRoomQr.useMutation();
  const revoke = api.judging.revokeRoomLink.useMutation();
  const rotate = api.judging.rotateRoomLink.useMutation();
  const move = api.judging.moveRoom.useMutation();
  const archive = api.judging.archiveRoom.useMutation();
  const revokeGuest = api.judging.revokeGuest.useMutation();
  const removeJudge = api.judging.removeJudgeFromRoom.useMutation();
  const data = query.data;
  const commsChannelId =
    commsDraft.hackathonId === data.hackathon.id
      ? commsDraft.channelId
      : data.configuration.judgingCommsChannelId;

  function setCommsChannelId(channelId: string | null) {
    setCommsDraft({ channelId, hackathonId: data.hackathon.id });
  }

  function refresh() {
    void query.refetch();
    startTransition(() => router.refresh());
  }

  function selectHackathon(hackathonId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("hackathon", hackathonId);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  async function showQr(room: Room, mode: "generate" | "rotate" = "generate") {
    try {
      const value =
        mode === "rotate"
          ? await rotate.mutateAsync({ roomId: room.id })
          : await generate.mutateAsync({ roomId: room.id });
      setQr({ roomName: room.name, value });
      if (value.discordDelivery === "failed") {
        toast.error(
          mode === "rotate"
            ? "QR rotated, but the Discord message failed."
            : "QR generated, but the Discord message failed.",
        );
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR update failed.");
    }
  }

  async function updateCommsChannel(channelId: string | null) {
    try {
      const result = await saveComms.mutateAsync({
        channelId,
        hackathonId: data.hackathon.id,
      });
      setCommsChannelId(channelId);
      if (result.failedRooms.length) {
        toast.error(
          `Channel saved, but ${result.failedRooms.length} room thread${result.failedRooms.length === 1 ? "" : "s"} need a retry.`,
        );
      } else {
        toast.success(
          channelId
            ? "Judging communications connected."
            : "Judging communications disconnected.",
        );
      }
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Discord communications could not be saved.",
      );
    }
  }

  async function moveRoom(roomId: string, direction: "up" | "down") {
    try {
      await move.mutateAsync({ direction, roomId });
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Room reorder failed.",
      );
    }
  }

  const activeRoomIds = data.rooms
    .filter((room) => room.archivedAt === null)
    .map((room) => room.id);
  const missingThreadCount = data.rooms.filter(
    (room) =>
      room.archivedAt === null &&
      data.configuration.judgingCommsChannelId &&
      !room.discordThreadId,
  ).length;

  const Root = embedded ? "div" : "main";

  return (
    <Root
      className={embedded ? "space-y-4" : adminPageLayoutClassName}
      aria-busy={pending || query.isFetching}
    >
      {!embedded ? (
        <AdminPageHeader
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-11 gap-2"
                onClick={() => setAnnouncementRoom("global")}
                variant="outline"
              >
                <Megaphone className="size-4" aria-hidden="true" /> Announce to
                all rooms
              </Button>
              <Button
                className="h-11 gap-2"
                disabled={!data.challenges.length}
                onClick={() => setEditing("new")}
              >
                <Plus className="size-4" aria-hidden="true" /> Create room
              </Button>
            </div>
          }
          description="Provision physical rooms, distribute guest access, and watch the live judge roster."
          eyebrow="Officer command center"
          icon={DoorOpen}
          title="Judging rooms"
        />
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="h-11 gap-2"
            onClick={() => setAnnouncementRoom("global")}
            variant="outline"
          >
            <Megaphone className="size-4" aria-hidden="true" /> Announce to all
            rooms
          </Button>
          <Button
            className="h-11 gap-2"
            disabled={!data.challenges.length}
            onClick={() => setEditing("new")}
          >
            <Plus className="size-4" aria-hidden="true" /> Create room
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-card/90 p-4 shadow-xl shadow-black/10 sm:flex-row sm:items-end sm:justify-between">
        {!embedded ? (
          <label className="space-y-2">
            <span className="block text-sm font-medium">Hackathon</span>
            <select
              aria-label="Manage hackathon judging rooms"
              className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm sm:min-w-72"
              onChange={(event) => selectHackathon(event.target.value)}
              value={data.hackathon.id}
            >
              {hackathons.map((hackathon) => (
                <option key={hackathon.id} value={hackathon.id}>
                  {hackathon.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <p className="text-sm font-medium">Judging rooms</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Provisioned for {data.hackathon.displayName}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {data.rooms.filter((room) => !room.archivedAt).length} rooms
          </Badge>
          <Badge variant={data.inventoryLockedAt ? "outline" : "secondary"}>
            {data.inventoryLockedAt ? "Inventory locked" : "Inventory unlocked"}
          </Badge>
          <Badge
            className="gap-1 border-[#DBC049]/35 text-[#DBC049]"
            variant="outline"
          >
            <UsersRound className="size-3" aria-hidden="true" />
            {data.rooms.reduce(
              (total, room) =>
                total +
                room.judges.filter((judge) =>
                  isActivePresence(judge.lastSeenAt),
                ).length,
              0,
            )}{" "}
            in rooms
          </Badge>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold">Judging communications</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Give every room a quiet Discord thread for judge arrivals, guest
                check-ins, QR delivery, and access changes.
              </p>
            </div>
          </div>
          <Badge
            variant={
              data.configuration.judgingCommsChannelId ? "outline" : "secondary"
            }
          >
            {data.configuration.judgingCommsChannelId
              ? missingThreadCount
                ? `${missingThreadCount} thread${missingThreadCount === 1 ? "" : "s"} pending`
                : "Connected"
              : "Optional · disconnected"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="judging-comms-channel">Root Discord channel</Label>
            <ResponsiveComboBox
              ariaLabel="Root judging communications channel"
              buttonPlaceholder="Choose a text channel"
              emptyMessage="No matching text channels found."
              getItemLabel={(channel) => `#${channel.name}`}
              getItemSearchValue={(channel) => `${channel.name} ${channel.id}`}
              getItemValue={(channel) => channel.id}
              inputPlaceholder="Search channels"
              isDisabled={saveComms.isPending}
              isLoading={channels.isLoading}
              items={
                channels.data ??
                (commsChannelId
                  ? [{ id: commsChannelId, name: commsChannelId }]
                  : [])
              }
              onValueChange={setCommsChannelId}
              renderItem={(channel) => (
                <span className="flex min-w-0 items-center gap-2">
                  <Hash
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{channel.name}</span>
                </span>
              )}
              triggerClassName="h-11 bg-background/70"
              triggerId="judging-comms-channel"
              value={commsChannelId}
            />
            <p className="text-sm text-muted-foreground">
              Blade uses the configured{" "}
              {data.discordGuildId ? "Knight Hacks server" : "Discord server"}{" "}
              for this environment.
            </p>
            <p className="text-sm font-medium text-foreground">
              Use an organizer-only channel. Room threads inherit the channel's
              readers, and mentions do not restrict who can view QR links or
              guest notices.
            </p>
            {channels.isError ? (
              <p className="text-sm text-destructive">
                Discord channels could not be loaded. Check the bot's access to
                this server, then retry.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.configuration.judgingCommsChannelId ? (
              <Button
                className="h-11"
                disabled={saveComms.isPending}
                onClick={() => void updateCommsChannel(null)}
                variant="outline"
              >
                Disconnect
              </Button>
            ) : null}
            {missingThreadCount ? (
              <Button
                className="h-11"
                disabled={retryThreads.isPending}
                onClick={async () => {
                  try {
                    const result = await retryThreads.mutateAsync({
                      hackathonId: data.hackathon.id,
                    });
                    if (result.failedRooms.length) {
                      toast.error(
                        `${result.failedRooms.length} room thread${result.failedRooms.length === 1 ? "" : "s"} still need a retry.`,
                      );
                    } else {
                      toast.success("Room threads are ready.");
                    }
                    refresh();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Room threads could not be provisioned.",
                    );
                  }
                }}
                variant="secondary"
              >
                Retry {missingThreadCount}{" "}
                {missingThreadCount === 1 ? "thread" : "threads"}
              </Button>
            ) : null}
            <Button
              className="h-11"
              disabled={
                saveComms.isPending ||
                commsChannelId === data.configuration.judgingCommsChannelId
              }
              onClick={() => void updateCommsChannel(commsChannelId)}
            >
              {saveComms.isPending ? "Saving…" : "Save channel"}
            </Button>
          </div>
        </div>
      </section>

      {data.globalAnnouncement ? (
        <section className="bg-[#DBC049]/8 rounded-lg border border-[#DBC049]/35 p-4 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">Announcement to all rooms</p>
                <Badge
                  variant={
                    data.globalAnnouncement.isUrgent ? "destructive" : "outline"
                  }
                >
                  {data.globalAnnouncement.isUrgent ? "Urgent" : "Banner"}
                </Badge>
                <Badge variant="secondary">
                  {data.globalAnnouncement.includeGuests
                    ? "Members and guests"
                    : "Authenticated judges"}
                </Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {data.globalAnnouncement.message}
              </p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              onClick={() => setAnnouncementRoom("global")}
              size="sm"
              variant="outline"
            >
              Manage
            </Button>
          </div>
        </section>
      ) : null}

      {!data.challenges.length ? (
        <Alert>
          <QrCode className="size-4" />
          <AlertTitle>Import projects first</AlertTitle>
          <AlertDescription>
            Rooms must point to an imported challenge. Add the Devpost
            inventory, then return here to provision rooms.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
        {data.rooms.length ? (
          <div className="divide-y divide-border/60">
            {data.rooms.map((room) => {
              const archived = room.archivedAt !== null;
              const activeRoomIndex = activeRoomIds.indexOf(room.id);
              const activeJudgeCount = room.judges.filter((judge) =>
                isActivePresence(judge.lastSeenAt),
              ).length;
              return (
                <article className="p-4 sm:p-5" key={room.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{room.name}</h2>
                        <Badge
                          variant={
                            room.challengeLabel === "General"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {room.challengeLabel}
                        </Badge>
                        {room.activeLinkId ? (
                          <Badge
                            className="border-[#DBC049]/35 text-[#DBC049]"
                            variant="outline"
                          >
                            QR live
                          </Badge>
                        ) : null}
                        {room.announcement ? (
                          <>
                            <Badge
                              variant={
                                room.announcement.isUrgent
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {room.announcement.isUrgent
                                ? "Urgent notice"
                                : "Notice live"}
                            </Badge>
                            <Badge variant="secondary">
                              {room.announcement.includeGuests
                                ? "Members and guests"
                                : "Authenticated judges"}
                            </Badge>
                          </>
                        ) : null}
                        {archived ? (
                          <Badge variant="destructive">Archived</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeJudgeCount} judge
                        {activeJudgeCount === 1 ? "" : "s"} currently active
                      </p>
                    </div>
                    {!archived ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Move ${room.name} up`}
                          disabled={activeRoomIndex <= 0 || move.isPending}
                          onClick={() => void moveRoom(room.id, "up")}
                          size="icon"
                          variant="ghost"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Move ${room.name} down`}
                          disabled={
                            activeRoomIndex === activeRoomIds.length - 1 ||
                            move.isPending
                          }
                          onClick={() => void moveRoom(room.id, "down")}
                          size="icon"
                          variant="ghost"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          onClick={() => setEditing(room)}
                          size="sm"
                          variant="outline"
                        >
                          <Pencil className="mr-1 size-4" /> Edit
                        </Button>
                        <Button
                          className="min-h-11"
                          onClick={() => setAnnouncementRoom(room)}
                          size="sm"
                          variant="outline"
                        >
                          <Megaphone className="mr-1 size-4" /> Announce
                        </Button>
                        <Button
                          disabled={generate.isPending || rotate.isPending}
                          onClick={() => void showQr(room)}
                          size="sm"
                          variant="outline"
                        >
                          <QrCode className="mr-1 size-4" />
                          {room.activeLinkId ? "View QR" : "Generate QR"}
                        </Button>
                        {room.discordThreadId && data.discordGuildId ? (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`https://discord.com/channels/${data.discordGuildId}/${room.discordThreadId}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLink className="mr-1 size-4" />
                              Open thread
                            </a>
                          </Button>
                        ) : null}
                        {room.activeLinkId ? (
                          <>
                            <Button
                              disabled={
                                sendQr.isPending ||
                                !data.configuration.judgingCommsChannelId
                              }
                              onClick={async () => {
                                try {
                                  const result = await sendQr.mutateAsync({
                                    roomId: room.id,
                                  });
                                  if (result.discordDelivery === "delivered") {
                                    toast.success(
                                      "QR sent to current room judges.",
                                    );
                                  } else if (
                                    result.discordDelivery === "failed"
                                  ) {
                                    toast.error(
                                      "The QR is still active, but Discord delivery failed.",
                                    );
                                  } else {
                                    toast.error(
                                      "Connect a Discord channel to send this QR.",
                                    );
                                  }
                                  refresh();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "QR delivery failed.",
                                  );
                                }
                              }}
                              size="sm"
                              title={
                                data.configuration.judgingCommsChannelId
                                  ? "Send the current QR and mention assigned authenticated judges"
                                  : "Connect a Discord channel to send this QR"
                              }
                              variant="secondary"
                            >
                              <Send className="mr-1 size-4" /> Send QR
                            </Button>
                            <Button
                              disabled={revoke.isPending}
                              onClick={async () => {
                                try {
                                  const result = await revoke.mutateAsync({
                                    roomId: room.id,
                                  });
                                  if (result.discordDelivery === "failed") {
                                    toast.error(
                                      "Room access was revoked, but the Discord notice failed.",
                                    );
                                  } else {
                                    toast.success(
                                      "Room QR and guest sessions revoked.",
                                    );
                                  }
                                  refresh();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Room QR revocation failed.",
                                  );
                                }
                              }}
                              size="sm"
                              variant="destructive"
                            >
                              <KeyRound className="mr-1 size-4" /> Revoke
                            </Button>
                            <Button
                              disabled={generate.isPending || rotate.isPending}
                              onClick={() => void showQr(room, "rotate")}
                              size="sm"
                              variant="outline"
                            >
                              <RefreshCw className="mr-1 size-4" /> Rotate
                            </Button>
                          </>
                        ) : null}
                        <Button
                          onClick={() => setArchiving(room)}
                          size="sm"
                          variant="ghost"
                        >
                          <Archive className="mr-1 size-4" /> Archive
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-md border border-border/70 bg-background/60">
                    {room.judges.length ? (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 border-b border-border bg-background text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Judge</th>
                              <th className="px-3 py-2 font-medium">Access</th>
                              <th className="hidden px-3 py-2 font-medium sm:table-cell">
                                Joined
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Status
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {room.judges.map((judge) => {
                              const active = isActivePresence(judge.lastSeenAt);
                              return (
                                <tr
                                  key={`${judge.judgeId}-${judge.guestSessionId ?? "member"}`}
                                >
                                  <td className="px-3 py-3 font-medium">
                                    {judge.displayName}
                                  </td>
                                  <td className="px-3 py-3 text-muted-foreground">
                                    {judge.kind === "guest"
                                      ? "Guest QR"
                                      : "Blade account"}
                                  </td>
                                  <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                                    {judge.joinedAt.toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        timeZone: data.hackathon.timezone,
                                      },
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <span
                                      className={
                                        active
                                          ? "text-[#DBC049]"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {active ? "Live" : "Idle"}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      Last seen{" "}
                                      {judge.lastSeenAt.toLocaleTimeString(
                                        "en-US",
                                        {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          timeZone: data.hackathon.timezone,
                                        },
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <Button
                                      aria-label={`${judge.kind === "guest" ? "Revoke" : "Remove"} ${judge.displayName}`}
                                      onClick={async () => {
                                        try {
                                          let discordNoticeFailed = false;
                                          if (
                                            judge.kind === "guest" &&
                                            judge.guestSessionId
                                          ) {
                                            const result =
                                              await revokeGuest.mutateAsync({
                                                guestSessionId:
                                                  judge.guestSessionId,
                                              });
                                            discordNoticeFailed =
                                              result.discordDelivery ===
                                              "failed";
                                          } else {
                                            await removeJudge.mutateAsync({
                                              judgeId: judge.judgeId,
                                            });
                                          }
                                          if (discordNoticeFailed) {
                                            toast.error(
                                              "Guest access was revoked, but the Discord notice failed.",
                                            );
                                          } else {
                                            toast.success(
                                              judge.kind === "guest"
                                                ? "Guest access revoked."
                                                : "Judge removed from room.",
                                            );
                                          }
                                          refresh();
                                        } catch (error) {
                                          toast.error(
                                            error instanceof Error
                                              ? error.message
                                              : "Judge removal failed.",
                                          );
                                        }
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <UserRoundX className="size-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No judges are assigned to this room.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <DoorOpen className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No judging rooms yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Create rooms from the imported challenge list. Generate QRs only
              when you are ready to lock the project inventory.
            </p>
          </div>
        )}
      </section>

      {announcementRoom ? (
        <AnnouncementDialog
          current={
            announcementRoom === "global"
              ? data.globalAnnouncement
              : announcementRoom.announcement
          }
          data={data}
          onClose={() => setAnnouncementRoom(null)}
          onSaved={refresh}
          room={announcementRoom === "global" ? null : announcementRoom}
        />
      ) : null}
      <RoomEditor
        data={data}
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={refresh}
        room={editing}
      />
      <RoomQrDialog
        onOpenChange={(open) => !open && setQr(null)}
        qr={qr?.value ?? null}
        roomName={qr?.roomName ?? "Room"}
      />
      <Dialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>Archive {archiving?.name}?</DialogTitle>
            <DialogDescription>
              This revokes its QR, ends current room presence, and keeps the
              room record for scheduling history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setArchiving(null)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={archive.isPending}
              onClick={async () => {
                if (!archiving) return;
                try {
                  await archive.mutateAsync({ roomId: archiving.id });
                  toast.success("Room archived.");
                  setArchiving(null);
                  refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Room archive failed.",
                  );
                }
              }}
              variant="destructive"
            >
              {archive.isPending ? "Archiving…" : "Archive room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Root>
  );
}
