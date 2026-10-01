"use client";

import { useEffect, useState } from "react";
import { Crown, Info, LockKeyhole, UsersRound } from "lucide-react";

import type {
  HackerParticipantInput,
  HackerParticipantOutput,
} from "@forge/hacker-sdk/contracts";
import {
  useChangeHackerTeam,
  useHackerDashboard,
  useHackerSession,
  useHackerTeams,
} from "@forge/hacker-sdk/react";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";

import { KhixDashboardShell } from "./khix-dashboard";
import styles from "./khix-dashboard.module.css";

type HackerTeamAction = HackerParticipantInput<"changeTeam">;

type Team = NonNullable<HackerParticipantOutput<"getTeams">["ownTeam"]>;
const preferenceCopy =
  "Your class sets your turn for food and events like the career fair. Choose together to eat and attend as a team, or separate to stagger your turns so someone can keep working. Pick what suits how your team works and socializes.";

export function KhixTeams() {
  const session = useHackerSession();
  const dashboard = useHackerDashboard();
  const unlocked = ["confirmed", "checkedin"].includes(
    dashboard.data?.application?.status ?? "",
  );
  return (
    <KhixDashboardShell
      activeItem="teams"
      sessionUser={{ name: session.data?.displayName }}
    >
      <section
        className={styles.journeyExperience}
        aria-labelledby="teams-title"
      >
        <header className={styles.journeyHero}>
          <p className={styles.journeyEyebrow}>Knight Hacks IX</p>
          <h1 id="teams-title" className={styles.journeyTitle}>
            Find your people.
          </h1>
          <p className={styles.journeyIntro}>
            Build a team of up to four. Pick how you explore the hackathon
            together.
          </p>
        </header>
        {dashboard.isPending ? (
          <p role="status">Loading teams…</p>
        ) : dashboard.isError ? (
          <div role="alert">
            <p>Could not check your confirmation.</p>
            <Button onClick={() => void dashboard.refetch()}>Try again</Button>
          </div>
        ) : !unlocked ? (
          <div className={styles.journeyPanel}>
            <LockKeyhole className="mb-3 size-6" aria-hidden="true" />
            <h2 className="text-xl">Unlocks after confirmation</h2>
            <p className={styles.journeyIntro}>
              Confirm your attendance from the dashboard to create or join a
              team.
            </p>
          </div>
        ) : (
          <TeamsContent />
        )}
      </section>
    </KhixDashboardShell>
  );
}

function TeamsContent() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState({ query: "", page: 0 });
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setSearch({ query: input, page: 0 }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [input]);
  const teams = useHackerTeams(search.query, search.page);
  const change = useChangeHackerTeam();
  const [editor, setEditor] = useState<Team | "new" | null>(null);
  const [confirm, setConfirm] = useState<{
    input: HackerTeamAction;
    title: string;
    copy: string;
  } | null>(null);
  const run = (input: HackerTeamAction) =>
    change.mutate(input, {
      onSuccess: () => {
        toast.success("Team updated.");
        setEditor(null);
        setConfirm(null);
      },
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not update the team.",
        ),
    });
  if (teams.isPending) return <p role="status">Loading teams…</p>;
  if (teams.isError)
    return (
      <div role="alert" className={styles.journeyPanel}>
        <p>{teams.error.message}</p>
        <Button onClick={() => void teams.refetch()}>Try again</Button>
      </div>
    );
  const { ownTeam, pendingTeam, attendeeId, canJoin } = teams.data;
  const owner = ownTeam?.members.some(
    (m) => m.attendeeId === attendeeId && m.owner,
  );
  return (
    <>
      {ownTeam ? (
        <section className={styles.journeyPanel} aria-label="Your team">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={styles.journeyEyebrow}>
                Your team · {ownTeam.members.length}/4
              </p>
              <h2 className="break-words text-2xl font-semibold">
                {ownTeam.name}
              </h2>
            </div>
            {owner && (
              <Button
                className={styles.ghostButton}
                disabled={change.isPending}
                onClick={() => setEditor(ownTeam)}
              >
                Team settings
              </Button>
            )}
          </div>
          <div className="my-5 grid gap-3 sm:grid-cols-2">
            {ownTeam.members.map((member) => (
              <div
                key={member.attendeeId}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="break-words">{member.name}</span>
                    {member.owner && (
                      <Crown className="size-4 shrink-0" aria-label="Owner" />
                    )}
                  </p>
                  <p className="mt-1 text-sm opacity-75">
                    {member.checkedIn
                      ? (member.className ?? "Checked in")
                      : "Not checked in"}
                  </p>
                </div>
                {owner && member.attendeeId !== attendeeId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0"
                    disabled={change.isPending}
                    onClick={() =>
                      setConfirm({
                        input: {
                          action: "remove",
                          teamId: ownTeam.id,
                          attendeeId: member.attendeeId,
                        },
                        title: `Remove ${member.name}?`,
                        copy: "They can find another team before check-in.",
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {Array.from({ length: 4 - ownTeam.members.length }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-dashed border-white/15 p-3 text-sm opacity-60"
              >
                <UsersRound className="size-4" aria-hidden="true" />
                {ownTeam.frozen ? "Membership locked" : "Open seat"}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <p className="font-semibold">
                {ownTeam.together ? "Together" : "Separate"}
                {ownTeam.className ? ` · ${ownTeam.className}` : ""}
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="About class preferences"
                  >
                    <Info className="size-4" aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)]">
                  <DialogHeader>
                    <DialogTitle>
                      How do you like to spend the hackathon?
                    </DialogTitle>
                    <DialogDescription>{preferenceCopy}</DialogDescription>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Separate classes spread your team across the available
                    turns. Some turns may still overlap.
                  </p>
                </DialogContent>
              </Dialog>
            </div>
            <p className={`${styles.journeyIntro} mt-2`}>
              {ownTeam.frozen
                ? "Check-in has started. New joins and class preferences are locked."
                : "Your first teammate's check-in locks membership and this preference."}
            </p>
          </div>
          <Button
            className={`${styles.ghostButton} mt-4`}
            disabled={change.isPending}
            onClick={() =>
              setConfirm({
                input: { action: "leave" },
                title: "Leave your team?",
                copy: owner
                  ? ownTeam.members.length === 1
                    ? "You are the last member. This deletes the team and its pending requests."
                    : "A remaining teammate will become the owner at random."
                  : "You can join another team only before checking in.",
              })
            }
          >
            Leave team
          </Button>
          {owner && ownTeam.requests.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <h3 className="font-semibold">
                Join requests · {ownTeam.requests.length}
              </h3>
              <div className="mt-3 max-h-72 divide-y divide-white/10 overflow-y-auto">
                {ownTeam.requests.map((request) => (
                  <div
                    key={request.attendeeId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <span className="min-w-0 break-words">{request.name}</span>
                    <div className="flex gap-2">
                      <Button
                        className={styles.primaryButton}
                        disabled={
                          change.isPending ||
                          ownTeam.frozen ||
                          ownTeam.members.length >= 4
                        }
                        onClick={() =>
                          run({
                            action: "decide",
                            teamId: ownTeam.id,
                            attendeeId: request.attendeeId,
                            accept: true,
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        className={styles.ghostButton}
                        disabled={change.isPending}
                        onClick={() =>
                          run({
                            action: "decide",
                            teamId: ownTeam.id,
                            attendeeId: request.attendeeId,
                            accept: false,
                          })
                        }
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : pendingTeam ? (
        <section className={styles.journeyPanel}>
          <p className={styles.journeyEyebrow}>Request sent</p>
          <h2 className="break-words text-xl">{pendingTeam.name}</h2>
          <p className={`${styles.journeyIntro} my-3`}>
            Waiting for the owner. Your place is confirmed only when they
            accept.
          </p>
          <Button
            className={styles.ghostButton}
            disabled={change.isPending}
            onClick={() => run({ action: "cancel" })}
          >
            Cancel request
          </Button>
        </section>
      ) : (
        <section
          className={`${styles.journeyPanel} flex flex-wrap items-center justify-between gap-4`}
        >
          <div>
            <h2 className="text-xl font-semibold">Your team starts here</h2>
            <p className={`${styles.journeyIntro} mt-2`}>
              {canJoin
                ? "Create your own, or find friends in the directory below."
                : "You have checked in. You can browse teams, but joining and creating are closed."}
            </p>
          </div>
          {canJoin && (
            <Button
              className={styles.primaryButton}
              onClick={() => setEditor("new")}
            >
              Create team
            </Button>
          )}
        </section>
      )}
      <section className={styles.journeyPanel} aria-label="Team directory">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Team directory</h2>
          <div className="w-full sm:max-w-xs">
            <Label htmlFor="team-search">Search by person or team name</Label>
            <Input
              id="team-search"
              className="mt-2 min-h-11 bg-black/20"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>
        {teams.data.teams.length === 0 ? (
          <p className="py-8 text-center opacity-75">
            No teams found. Try another name or start your own.
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {teams.data.teams.map((team) => (
              <article
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-semibold">
                    {team.name}{" "}
                    <span className="whitespace-nowrap text-sm font-normal opacity-70">
                      {team.members.length}/4
                    </span>
                  </h3>
                  <p className="mt-1 break-words text-sm opacity-80">
                    {team.members.map((m) => m.name).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs opacity-65">
                    {team.frozen
                      ? "Locked after check-in"
                      : team.members.length === 4
                        ? "Team full"
                        : "Accepting requests"}
                  </p>
                </div>
                {team.id === ownTeam?.id ? (
                  <span className="text-sm font-semibold">Your team</span>
                ) : team.id === pendingTeam?.id ? (
                  <span className="text-sm">Requested</span>
                ) : (
                  !ownTeam &&
                  !pendingTeam &&
                  canJoin && (
                    <Button
                      className={styles.ghostButton}
                      disabled={
                        change.isPending ||
                        team.frozen ||
                        team.members.length >= 4
                      }
                      onClick={() =>
                        run({ action: "request", teamId: team.id })
                      }
                    >
                      Request to join
                    </Button>
                  )
                )}
              </article>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            disabled={search.page === 0}
            onClick={() => setSearch({ ...search, page: search.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm">Page {search.page + 1}</span>
          <Button
            variant="ghost"
            disabled={!teams.data.hasMore}
            onClick={() => setSearch({ ...search, page: search.page + 1 })}
          >
            Next
          </Button>
        </div>
      </section>
      <p className={styles.journeyIntro}>
        Teams here coordinate class assignments. Project submissions and judging
        memberships are managed separately.
      </p>
      {editor && (
        <TeamEditor
          key={editor === "new" ? "new" : editor.id}
          team={editor === "new" ? null : editor}
          busy={change.isPending}
          close={() => setEditor(null)}
          save={run}
        />
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !change.isPending) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.copy}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={change.isPending}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={change.isPending}
              onClick={() => {
                if (confirm) run(confirm.input);
              }}
            >
              {change.isPending ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamEditor({
  team,
  busy,
  close,
  save,
}: {
  team: Team | null;
  busy: boolean;
  close: () => void;
  save: (input: HackerTeamAction) => void;
}) {
  const [together, setTogether] = useState(team?.together ?? true);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {team ? "Team settings" : "Create your team"}
          </DialogTitle>
          <DialogDescription>
            Up to four hackers, including you. Each hacker can belong to one
            team.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("name");
            const name = typeof value === "string" ? value.trim() : "";
            save(
              team
                ? { action: "update", teamId: team.id, name, together }
                : { action: "create", name },
            );
          }}
        >
          <div>
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              name="name"
              defaultValue={team?.name ?? ""}
              maxLength={64}
              required
              className="mt-2 min-h-11"
            />
          </div>
          {team && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="team-together">
                  Assign us to the same class
                </Label>
                <Switch
                  id="team-together"
                  checked={together}
                  onCheckedChange={setTogether}
                  disabled={team.frozen || busy}
                />
              </div>
              <p className="text-sm text-muted-foreground">{preferenceCopy}</p>
              {team.frozen && (
                <p className="text-sm">
                  Locked because a teammate has checked in.
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : team ? "Save team" : "Create team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
