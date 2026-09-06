"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DoorOpen,
  FolderKanban,
  LogOut,
  MapPin,
  Pencil,
  ShieldCheck,
  Star,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import type { ProjectDirectoryInput } from "./project-directory";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";
import { EvaluationDialog } from "../judging/evaluation-dialog";
import { JudgeDeliberation } from "../judging/judge-deliberation";
import { JudgeSubmissions } from "../judging/judge-submissions";
import { ProjectScoreDialog } from "../judging/project-score-dialog";
import { ProjectDirectory } from "./project-directory";

type JudgeData = RouterOutputs["projects"]["listJudge"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];
type JudgingContext = RouterOutputs["judging"]["getContext"];
type Workspace = RouterOutputs["judging"]["getWorkspace"];
type Scores = RouterOutputs["judging"]["getProjectScores"];
type Submissions = RouterOutputs["judging"]["listMySubmissions"];
type Deliberation = RouterOutputs["judging"]["listMyDeliberation"];
type JudgeProject = JudgeData["projects"][number];

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
    <label className="w-full min-w-0 space-y-1 sm:w-72">
      <span className="block text-xs font-medium text-muted-foreground">
        Judging room
      </span>
      <select
        aria-label="Judging room"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
  deliberation = [],
  hackathons,
  input,
  isOfficer,
  judgingContext,
  scores = [],
  selectedTab = "projects",
  submissions = [],
  workspace = null,
}: {
  data: JudgeData;
  deliberation?: Deliberation;
  hackathons: Hackathons;
  input: ProjectDirectoryInput & { hackathonId?: string };
  isOfficer: boolean;
  judgingContext?: Exclude<
    JudgingContext,
    { kind: "none" | "incomplete-guest" }
  >;
  scores?: Scores;
  selectedTab?: "deliberation" | "projects" | "submissions";
  submissions?: Submissions;
  workspace?: Workspace | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [evaluationProject, setEvaluationProject] =
    useState<JudgeProject | null>(null);
  const [scoreProject, setScoreProject] = useState<JudgeProject | null>(null);
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

  function selectTab(tab: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "projects") next.delete("tab");
    else next.set("tab", tab);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const scoreByProject = new Map(
    scores.map((score) => [score.projectId, score]),
  );
  const challengeLabel =
    data.challenges.find((challenge) => challenge.id === workspace?.challengeId)
      ?.label ??
    (context.kind === "guest" ? context.challengeLabel : "General") ??
    "Room challenge";
  const selectedSubmission = submissions.find(
    (submission) =>
      submission.projectId === evaluationProject?.id &&
      submission.challengeId === workspace?.challengeId,
  );

  return (
    <main className={adminPageLayoutClassName} aria-busy={pending}>
      <AdminPageHeader
        actions={
          <div className="flex w-full flex-wrap items-end gap-2 lg:w-auto">
            {memberContext?.rooms.length ? (
              <MemberRoomSelector context={memberContext} />
            ) : null}
            {isOfficer && hackathons.length ? (
              <label className="w-full min-w-0 sm:w-72">
                <span className="sr-only">Preview hackathon</span>
                <select
                  aria-label="Preview hackathon"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          {!workspace ? (
            <section className="rounded-lg border border-dashed border-white/15 bg-card/75 px-5 py-16 text-center shadow-xl shadow-black/10">
              <h2 className="text-xl font-semibold">No projects imported</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                An officer must import the Devpost project inventory before
                judging can begin.
              </p>
            </section>
          ) : null}
          {workspace ? (
            <Tabs onValueChange={selectTab} value={selectedTab}>
              <TabsList className="grid h-11 w-full grid-cols-3 sm:w-fit sm:min-w-[28rem]">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="deliberation">Deliberation</TabsTrigger>
              </TabsList>
              <TabsContent className="mt-4" value="projects">
                <ProjectDirectory
                  actions={(project) => {
                    const submitted = submissions.some(
                      (submission) =>
                        submission.projectId === project.id &&
                        submission.challengeId === workspace.challengeId,
                    );
                    return (
                      <Button
                        className="min-h-11 sm:min-h-9"
                        disabled={workspace.state !== "open"}
                        onClick={() => setEvaluationProject(project)}
                        size="sm"
                        type="button"
                      >
                        {submitted ? (
                          <Pencil className="mr-2 size-4" aria-hidden="true" />
                        ) : (
                          <Star className="mr-2 size-4" aria-hidden="true" />
                        )}
                        {submitted ? "Edit" : "Judge"}
                      </Button>
                    );
                  }}
                  data={data}
                  defaultChallengeLabel="General"
                  emptyDescription={
                    input.includeJudged
                      ? "No projects match this view yet."
                      : "You have judged every project in this challenge. Turn on See previously judged to review them."
                  }
                  extraColumns={[
                    {
                      cell: (project) => {
                        const score = scoreByProject.get(project.id)?.scoped;
                        return score?.value === null || score === undefined ? (
                          <>
                            <span aria-hidden="true">(?)</span>
                            <span className="sr-only">Not rated</span>
                          </>
                        ) : (
                          <Button
                            className="h-auto p-0 font-mono"
                            onClick={() => setScoreProject(project)}
                            type="button"
                            variant="link"
                          >
                            {score.value.toFixed(2)} ({score.count})
                            <span className="sr-only">
                              , view judge feedback for {project.title}
                            </span>
                          </Button>
                        );
                      },
                      header: "Challenge rating",
                      mobileLabel: `${challengeLabel} challenge rating`,
                    },
                    ...(context.kind === "member"
                      ? [
                          {
                            cell: (project: JudgeProject) => {
                              const score = scoreByProject.get(
                                project.id,
                              )?.overall;
                              return score?.value === null ||
                                score === undefined ? (
                                <>
                                  <span aria-hidden="true">(?)</span>
                                  <span className="sr-only">Not rated</span>
                                </>
                              ) : (
                                `${score.value.toFixed(2)} (${score.count})`
                              );
                            },
                            header: "Rating",
                          },
                        ]
                      : []),
                  ]}
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
                  showChallengeRatingSort={
                    context.kind === "member" && workspace.displayAllResults
                  }
                  showRatingSort={context.kind === "member"}
                  showChallenges={context.kind === "member"}
                  showPreviouslyJudgedFilter
                  showViewAction
                />
              </TabsContent>
              <TabsContent className="mt-4" value="submissions">
                <JudgeSubmissions
                  submissions={submissions}
                  workspace={workspace}
                />
              </TabsContent>
              <TabsContent className="mt-4" value="deliberation">
                <JudgeDeliberation
                  initialSections={deliberation}
                  key={JSON.stringify(deliberation)}
                  submissions={submissions}
                  workspace={workspace}
                />
              </TabsContent>
            </Tabs>
          ) : null}
          {workspace && evaluationProject ? (
            <EvaluationDialog
              challengeLabel={challengeLabel}
              key={`${evaluationProject.id}:${selectedSubmission?.revision ?? 0}`}
              onOpenChange={(open) => !open && setEvaluationProject(null)}
              open
              project={evaluationProject}
              submission={selectedSubmission}
              workspace={workspace}
            />
          ) : null}
          {workspace ? (
            <ProjectScoreDialog
              challengeLabel={challengeLabel}
              key={scoreProject?.id ?? "closed-score"}
              onOpenChange={(open) => !open && setScoreProject(null)}
              open={!!scoreProject}
              project={scoreProject}
              workspace={workspace}
            />
          ) : null}
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
