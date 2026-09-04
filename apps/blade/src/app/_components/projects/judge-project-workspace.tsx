"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DoorOpen,
  FolderKanban,
  LogOut,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import type { ProjectDirectoryInput } from "./project-directory";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";
import { ProjectDirectory } from "./project-directory";

type JudgeData = RouterOutputs["projects"]["listJudge"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];
type JudgingContext = RouterOutputs["judging"]["getContext"];

function JudgingHeartbeat({ roomId }: { roomId: string }) {
  const router = useRouter();
  const heartbeat = api.judging.heartbeat.useMutation();
  const mutate = heartbeat.mutate;
  useEffect(() => {
    const send = () =>
      mutate(
        { roomId },
        {
          onError(error) {
            if (
              error.data?.code === "UNAUTHORIZED" ||
              error.data?.code === "NOT_FOUND"
            ) {
              window.location.replace("/judge/access-error");
            }
          },
          onSuccess(result) {
            if (!result.updated) router.refresh();
          },
        },
      );
    send();
    const interval = window.setInterval(send, 60_000);
    return () => window.clearInterval(interval);
  }, [mutate, roomId, router]);
  return null;
}

function GuestSessionControl() {
  const endGuest = api.judging.endGuest.useMutation();

  async function endSession() {
    try {
      await endGuest.mutateAsync();
      window.location.assign("/judge/end");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not end the session.",
      );
    }
  }

  return (
    <Button
      className="h-11 gap-1 px-3 text-xs"
      disabled={endGuest.isPending}
      onClick={() => void endSession()}
      size="sm"
      variant="ghost"
    >
      <LogOut className="size-3" aria-hidden="true" />
      {endGuest.isPending ? "Ending…" : "End session"}
    </Button>
  );
}

function MemberRoomSelector({
  context,
}: {
  context: Extract<JudgingContext, { kind: "member" }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinRoom = api.judging.joinRoom.useMutation();
  const leaveRoom = api.judging.leaveRoom.useMutation();

  async function selectRoom(roomId: string) {
    try {
      if (!roomId) {
        if (context.activeRoomId) {
          await leaveRoom.mutateAsync({ roomId: context.activeRoomId });
        }
        const next = new URLSearchParams(searchParams.toString());
        next.delete("challenge");
        next.delete("page");
        toast.success("Left judging room.");
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
        router.refresh();
        return;
      }
      const room = await joinRoom.mutateAsync({ roomId });
      const next = new URLSearchParams(searchParams.toString());
      next.set("challenge", room.challengeId);
      next.delete("page");
      toast.success("Judging room selected.");
      router.replace(`${pathname}?${next.toString()}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Room update failed.",
      );
    }
  }

  return (
    <label className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">
        Judging room
      </span>
      <select
        aria-label="Judging room"
        className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm"
        disabled={joinRoom.isPending || leaveRoom.isPending}
        onChange={(event) => void selectRoom(event.target.value)}
        value={context.activeRoomId ?? ""}
      >
        <option value="">No room selected</option>
        {context.rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name} · {room.challengeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function JudgeProjectWorkspace({
  data,
  hackathons,
  input,
  isOfficer,
  judgingContext,
}: {
  data: JudgeData;
  hackathons: Hackathons;
  input: ProjectDirectoryInput & { hackathonId?: string };
  isOfficer: boolean;
  judgingContext?: Exclude<
    JudgingContext,
    { kind: "none" | "incomplete-guest" }
  >;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const context = judgingContext ?? {
    activeRoomId: null,
    displayName: "",
    hackathon: null,
    isOfficer,
    kind: "member" as const,
    rooms: [],
    userId: "",
  };

  const memberContext =
    judgingContext?.kind === "member" ? judgingContext : null;
  const activeRoom = memberContext?.rooms.find(
    (room) => room.id === memberContext.activeRoomId,
  );
  const heartbeatRoomId =
    context.kind === "guest" ? context.roomId : activeRoom?.id;

  function selectHackathon(hackathonId: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (hackathonId) next.set("hackathon", hackathonId);
    else next.delete("hackathon");
    next.delete("page");
    next.delete("challenge");
    next.delete("maxParticipants");
    next.delete("minParticipants");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <main className={adminPageLayoutClassName} aria-busy={pending}>
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap items-end gap-2">
            {memberContext?.rooms.length ? (
              <MemberRoomSelector context={memberContext} />
            ) : null}
            {isOfficer && hackathons.length ? (
              <label>
                <span className="sr-only">Preview hackathon</span>
                <select
                  aria-label="Preview hackathon"
                  className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => selectHackathon(event.target.value)}
                  value={input.hackathonId ?? data.hackathon?.id ?? ""}
                >
                  <option value="">Select a hackathon</option>
                  {hackathons.map((hackathon) => (
                    <option key={hackathon.id} value={hackathon.id}>
                      {hackathon.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        }
        description={
          context.kind === "guest"
            ? `You are judging ${context.challengeLabel ?? "this room's challenge"}. Search the assigned projects and open any entry for details.`
            : "Browse every submitted project, filter the field, and open a project to review its story and team."
        }
        eyebrow={
          context.kind === "guest" ? context.roomName : "Judge workspace"
        }
        icon={FolderKanban}
        title={data.hackathon?.displayName ?? "Hackathon projects"}
      />

      {data.hackathon ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {data.totalCount} project{data.totalCount === 1 ? "" : "s"}
            </Badge>
            {isOfficer ? (
              <Badge variant="outline">Officer preview</Badge>
            ) : null}
            {context.kind === "guest" ? (
              <>
                <Badge className="gap-1" variant="outline">
                  <MapPin className="size-3" aria-hidden="true" />
                  {context.roomName}
                </Badge>
                <Badge
                  className="gap-1 border-[#DBC049]/35 text-[#DBC049]"
                  variant="outline"
                >
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  {context.displayName}
                </Badge>
                <GuestSessionControl />
              </>
            ) : activeRoom ? (
              <Badge
                className="gap-1 border-[#DBC049]/35 text-[#DBC049]"
                variant="outline"
              >
                <DoorOpen className="size-3" aria-hidden="true" />
                {activeRoom.name}
              </Badge>
            ) : null}
          </div>
          {heartbeatRoomId ? (
            <JudgingHeartbeat roomId={heartbeatRoomId} />
          ) : null}
          <ProjectDirectory
            data={data}
            emptyDescription="No projects match this view yet."
            input={input}
            lockedChallenge={
              context.kind === "guest"
                ? {
                    id: context.challengeId,
                    label: context.challengeLabel ?? "Room challenge",
                  }
                : undefined
            }
            showTeamSizeFilters={false}
            showViewAction
          />
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-white/15 bg-card/75 px-5 py-16 text-center shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold">No active hackathon</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            The project directory becomes available to judges when a hackathon
            reaches its configured start time.
          </p>
        </section>
      )}
    </main>
  );
}
