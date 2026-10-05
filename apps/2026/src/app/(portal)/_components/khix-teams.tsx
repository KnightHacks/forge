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

import styles from "./khix-dashboard.module.css";

type HackerTeamAction = HackerParticipantInput<"changeTeam">;

type Team = NonNullable<HackerParticipantOutput<"getTeams">["ownTeam"]>;
const preferenceCopy =
  "Your class sets your turn for food and events like the career fair. Choose together to eat and attend as a team, or separate to stagger your turns so someone can keep working. Pick what suits how your team works and socializes.";

export function KhixTeams() {
  const dashboard = useHackerDashboard();
  const unlocked = ["confirmed", "checkedin"].includes(
    dashboard.data?.application?.status ?? "",
  );
  return (
    <section
      className={`${styles.journeyExperience} ${styles.teamsExperience}`}
      aria-labelledby="teams-title"
    >
      <header className={styles.journeyHero}>
        <h1 id="teams-title" className={styles.journeyTitle}>
          Teams
        </h1>
        <p className={styles.journeyIntro}>
          Find a team or create one with up to four hackers.
        </p>
      </header>
      {dashboard.isPending ? (
        <p role="status">Loading teams…</p>
      ) : dashboard.isError ? (
        <div role="alert" className={styles.teamSection}>
          <p>Could not check your confirmation.</p>
          <Button
            className={`${styles.ghostButton} mt-3`}
            onClick={() => void dashboard.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : !unlocked ? (
        <div className={styles.teamSection}>
          <LockKeyhole className="mb-3 size-6" aria-hidden="true" />
          <h2 className={styles.teamHeading}>Unlocks after confirmation</h2>
          <p className={styles.teamCopy}>
            Confirm your attendance from the dashboard to create or join a team.
          </p>
        </div>
      ) : (
        <TeamsContent />
      )}
    </section>
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
      <div role="alert" className={styles.teamSection}>
        <p>{teams.error.message}</p>
        <Button
          className={`${styles.ghostButton} mt-3`}
          onClick={() => void teams.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  const { ownTeam, pendingTeam, attendeeId, canJoin } = teams.data;
  const owner = ownTeam?.members.some(
    (m) => m.attendeeId === attendeeId && m.owner,
  );
  return (
    <>
      {ownTeam ? (
        <section className={styles.teamSection} aria-label="Your team">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-[1_1_16rem]">
              <h2 className={styles.teamHeading}>{ownTeam.name}</h2>
            </div>
            {owner && (
              <Button
                variant="ghost"
                className={styles.teamTextButton}
                disabled={change.isPending}
                onClick={() => setEditor(ownTeam)}
              >
                Team settings
              </Button>
            )}
          </div>
          <div className={styles.teamRoster}>
            {ownTeam.members.map((member) => (
              <div key={member.attendeeId} className={styles.teamMember}>
                <div className="min-w-0 flex-[1_1_8rem]">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {member.name}
                    </span>
                    {member.owner && (
                      <Crown className="size-4 shrink-0" aria-label="Owner" />
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--khix-muted)]">
                    {member.checkedIn
                      ? (member.className ?? "Checked in")
                      : "Not checked in"}
                  </p>
                </div>
                {owner && member.attendeeId !== attendeeId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.teamTextButton}
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
          </div>
          {ownTeam.members.length < 4 && (
            <p className={styles.teamOpenSeat}>
              <UsersRound className="size-4" aria-hidden="true" />
              {ownTeam.frozen
                ? "Membership locked"
                : `${4 - ownTeam.members.length} open ${ownTeam.members.length === 3 ? "seat" : "seats"}`}
            </p>
          )}
          <div className="pt-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">
                {ownTeam.together ? "Together" : "Separate"}
                {ownTeam.className ? ` · ${ownTeam.className}` : ""}
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-[var(--khix-muted)] hover:bg-white/5 hover:text-[var(--khix-ink)]"
                    aria-label="About class preferences"
                  >
                    <Info className="size-4" aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent className={styles.dialog}>
                  <DialogHeader>
                    <DialogTitle className={styles.dialogTitle}>
                      How do you like to spend the hackathon?
                    </DialogTitle>
                    <DialogDescription className={styles.dialogCopy}>
                      {preferenceCopy}
                    </DialogDescription>
                  </DialogHeader>
                  <p className={styles.dialogCopy}>
                    Separate classes spread your team across the available
                    turns. Some turns may still overlap.
                  </p>
                </DialogContent>
              </Dialog>
            </div>
            <p className={styles.teamCopy}>
              {ownTeam.frozen
                ? "Check-in has started. New joins and class preferences are locked."
                : "Your first teammate's check-in locks membership and this preference."}
            </p>
          </div>
          <Button
            variant="ghost"
            className={`${styles.teamTextButton} mt-3`}
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
            <div className="mt-5 border-t border-[var(--khix-panel-border)] pt-4">
              <h3 className="font-semibold">
                Join requests · {ownTeam.requests.length}
              </h3>
              <div className="mt-3 max-h-72 divide-y divide-[var(--khix-panel-border)] overflow-y-auto">
                {ownTeam.requests.map((request) => (
                  <div
                    key={request.attendeeId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {request.name}
                    </span>
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
                        variant="ghost"
                        className={styles.teamTextButton}
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
        <section className={styles.teamSection}>
          <h2 className={styles.teamHeading}>{pendingTeam.name}</h2>
          <p className={styles.teamCopy}>
            Waiting for the owner. Your place is confirmed only when they
            accept.
          </p>
          <Button
            variant="ghost"
            className={`${styles.teamTextButton} mt-3`}
            disabled={change.isPending}
            onClick={() => run({ action: "cancel" })}
          >
            Cancel request
          </Button>
        </section>
      ) : (
        <section
          className={`${styles.teamSection} flex flex-wrap items-center justify-between gap-4`}
        >
          <div className="min-w-0 flex-[1_1_20rem]">
            <h2 className={styles.teamHeading}>Your team starts here</h2>
            <p className={styles.teamCopy}>
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
      <section className={styles.teamSection} aria-label="Team directory">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className={styles.teamHeading}>Team directory</h2>
          <div className="w-full sm:max-w-xs">
            <Label htmlFor="team-search" className={styles.profileFormLabel}>
              Search by person or team name
            </Label>
            <Input
              id="team-search"
              className={`${styles.profileInput} mt-2 min-h-11`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>
        {teams.data.teams.length === 0 ? (
          <p className="py-8 text-center text-[var(--khix-muted)]">
            No teams found. Try another name or start your own.
          </p>
        ) : (
          <div className="divide-y divide-[var(--khix-panel-border)]">
            {teams.data.teams.map((team) => (
              <article
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-[1_1_16rem]">
                  <h3 className="text-lg font-semibold [overflow-wrap:anywhere]">
                    {team.name}{" "}
                    <span className="whitespace-nowrap text-sm font-normal text-[var(--khix-muted)]">
                      {team.members.length}/4
                    </span>
                  </h3>
                  <p className="mt-1 text-sm text-[var(--khix-muted)] [overflow-wrap:anywhere]">
                    {team.members.map((m) => m.name).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs text-[var(--khix-muted)]">
                    {team.frozen
                      ? "Locked after check-in"
                      : team.members.length === 4
                        ? "Team full"
                        : "Accepting requests"}
                  </p>
                </div>
                {team.id === ownTeam?.id ? (
                  <span className="text-sm font-semibold text-[var(--khix-accent)]">
                    Your team
                  </span>
                ) : team.id === pendingTeam?.id ? (
                  <span className="text-sm text-[var(--khix-accent)]">
                    Requested
                  </span>
                ) : (
                  !ownTeam &&
                  !pendingTeam &&
                  canJoin && (
                    <Button
                      variant="ghost"
                      className={styles.teamTextButton}
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
            className={styles.teamTextButton}
            disabled={search.page === 0}
            onClick={() => setSearch({ ...search, page: search.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--khix-muted)]">
            Page {search.page + 1}
          </span>
          <Button
            variant="ghost"
            className={styles.teamTextButton}
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
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle className={styles.dialogTitle}>
              {confirm?.title}
            </DialogTitle>
            <DialogDescription className={styles.dialogCopy}>
              {confirm?.copy}
            </DialogDescription>
          </DialogHeader>
          <div className={styles.dialogActionRow}>
            <Button
              variant="outline"
              className={styles.ghostButton}
              disabled={change.isPending}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className={`${styles.primaryButton} ${styles.withdrawHoldButton}`}
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
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            {team ? "Team settings" : "Create your team"}
          </DialogTitle>
          <DialogDescription className={styles.dialogCopy}>
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
            <Label htmlFor="team-name" className={styles.profileFormLabel}>
              Team name
            </Label>
            <Input
              id="team-name"
              name="name"
              defaultValue={team?.name ?? ""}
              maxLength={64}
              required
              className={`${styles.profileInput} mt-2 min-h-11`}
            />
          </div>
          {team && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor="team-together"
                  className={styles.profileFormLabel}
                >
                  Assign us to the same class
                </Label>
                <Switch
                  id="team-together"
                  className={styles.teamSwitch}
                  checked={together}
                  onCheckedChange={setTogether}
                  disabled={team.frozen || busy}
                />
              </div>
              <p className={styles.dialogCopy}>{preferenceCopy}</p>
              {team.frozen && (
                <p className="text-sm">
                  Locked because a teammate has checked in.
                </p>
              )}
            </div>
          )}
          <div className={styles.dialogActionRow}>
            <Button
              type="button"
              variant="outline"
              className={styles.ghostButton}
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={styles.primaryButton}
              disabled={busy}
            >
              {busy ? "Saving…" : team ? "Save team" : "Create team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
