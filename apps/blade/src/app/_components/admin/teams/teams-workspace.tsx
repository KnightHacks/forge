"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, UsersRound } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { HackerTeamAction } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { toast } from "@forge/ui/toast";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";

type Team = RouterOutputs["hackerTeam"]["list"]["teams"][number];
export function TeamsWorkspace({
  hackathons,
  hackathonId,
  canEdit,
}: {
  hackathons: RouterOutputs["hackerTeam"]["hackathons"];
  hackathonId?: string;
  canEdit: boolean;
}) {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        title="Teams"
        eyebrow="Hacks"
        icon={UsersRound}
        description="See who is building together and where each hacker checked in."
      />
      {hackathonId ? (
        <TeamList
          key={hackathonId}
          hackathonId={hackathonId}
          hackathons={hackathons}
          canEdit={canEdit}
        />
      ) : (
        <p className="text-muted-foreground">
          Create a hackathon to view its teams.
        </p>
      )}
    </main>
  );
}
function TeamList({
  hackathons,
  hackathonId,
  canEdit,
}: {
  hackathonId: string;
  hackathons: RouterOutputs["hackerTeam"]["hackathons"];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState<{
    query: string;
    page: number;
    together?: boolean;
  }>({ query: "", page: 0 });
  const [input, setInput] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setSearch((current) => ({ ...current, query: input, page: 0 })),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [input]);
  const list = api.hackerTeam.list.useQuery({ hackathonId, ...search });
  const utils = api.useUtils();
  const [rename, setRename] = useState<Team | null>(null);
  const [confirm, setConfirm] = useState<{
    change: HackerTeamAction;
    title: string;
    copy: string;
  } | null>(null);
  const change = api.hackerTeam.change.useMutation({
    onSuccess: async () => {
      await utils.hackerTeam.list.invalidate();
      setRename(null);
      setConfirm(null);
      toast.success("Team updated.");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 md:w-64">
          <Label htmlFor="teams-hackathon">Hackathon</Label>
          <Select
            value={hackathonId}
            onValueChange={(id) =>
              router.push(`/admin/teams?hackathonId=${id}`)
            }
          >
            <SelectTrigger id="teams-hackathon" className="mt-2 min-h-11">
              <SelectValue placeholder="Select a hackathon" />
            </SelectTrigger>
            <SelectContent>
              {hackathons.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name || "Untitled hackathon"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 md:w-auto md:flex-1">
          <Label htmlFor="organizer-team-search">
            Search by person or team name
          </Label>
          <Input
            id="organizer-team-search"
            value={input}
            maxLength={100}
            onChange={(e) => setInput(e.target.value)}
            className="mt-2 min-h-11"
          />
        </div>
        <div className="w-full md:w-48">
          <Label htmlFor="teams-preference">Class preference</Label>
          <Select
            value={
              search.together === undefined
                ? "all"
                : search.together
                  ? "together"
                  : "separate"
            }
            onValueChange={(value) =>
              setSearch({
                ...search,
                page: 0,
                together: value === "all" ? undefined : value === "together",
              })
            }
          >
            <SelectTrigger id="teams-preference" className="mt-2 min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All preferences</SelectItem>
              <SelectItem value="together">Together</SelectItem>
              <SelectItem value="separate">Separate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!canEdit && <Badge variant="secondary">Read-only</Badge>}
      </div>
      {list.isPending ? (
        <p role="status">Loading teams…</p>
      ) : list.isError ? (
        <div role="alert">
          <p>{list.error.message}</p>
          <Button onClick={() => void list.refetch()}>Retry</Button>
        </div>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            {list.data.teams.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">
                No teams match this search.
              </p>
            ) : (
              <div className="max-h-[70vh] divide-y overflow-y-auto">
                {list.data.teams.map((team) => (
                  <section
                    key={team.id}
                    className="space-y-4 p-4 sm:p-5"
                    aria-label={team.name}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <h2 className="break-words text-lg font-semibold">
                          {team.name}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            {team.members.length}/4
                          </span>
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {team.together ? "Together" : "Separate classes"}
                          </Badge>
                          <Badge
                            variant={team.frozen ? "secondary" : "outline"}
                          >
                            {team.frozen
                              ? "Locked after check-in"
                              : "Open membership"}
                          </Badge>
                          {team.className && (
                            <Badge variant="outline">{team.className}</Badge>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="min-h-11"
                            onClick={() => setRename(team)}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-11 text-destructive"
                            disabled={change.isPending}
                            onClick={() =>
                              setConfirm({
                                change: { action: "delete", teamId: team.id },
                                title: `Delete ${team.name}?`,
                                copy: "Members and pending requests will be removed from the team. Their class assignments and check-ins remain unchanged.",
                              })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {team.members.map((member) => (
                        <div
                          key={member.attendeeId}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-background/60 p-3"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              <span className="break-words">{member.name}</span>
                              {member.owner && (
                                <Crown
                                  className="size-4 shrink-0 text-primary"
                                  aria-label="Owner"
                                />
                              )}
                            </p>
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {member.checkedIn
                                ? `Checked in · ${member.className ?? "No class"}`
                                : "Not checked in"}
                            </p>
                          </div>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-11 shrink-0"
                              disabled={change.isPending}
                              aria-label={`Remove ${member.name}`}
                              onClick={() =>
                                setConfirm({
                                  change: {
                                    action: "remove",
                                    teamId: team.id,
                                    attendeeId: member.attendeeId,
                                  },
                                  title: `Remove ${member.name}?`,
                                  copy: member.owner
                                    ? "A remaining member becomes owner at random. An empty team is deleted. Existing class assignments stay unchanged."
                                    : "Their existing class and check-in stay unchanged.",
                                })
                              }
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {team.requests.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {team.requests.length} pending{" "}
                        {team.requests.length === 1 ? "request" : "requests"} ·
                        managed by the owner
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t p-3">
              <Button
                variant="outline"
                disabled={search.page === 0}
                onClick={() => setSearch({ ...search, page: search.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {search.page + 1}
              </span>
              <Button
                variant="outline"
                disabled={!list.data.hasMore}
                onClick={() => setSearch({ ...search, page: search.page + 1 })}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog
        open={!!rename}
        onOpenChange={(open) => {
          if (!open && !change.isPending) setRename(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
            <DialogDescription>
              Names are visible in the hacker team directory.
            </DialogDescription>
          </DialogHeader>
          {rename && (
            <form
              key={rename.id}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const value = new FormData(e.currentTarget).get("name");
                change.mutate({
                  hackathonId,
                  change: {
                    action: "update",
                    teamId: rename.id,
                    name: typeof value === "string" ? value.trim() : "",
                  },
                });
              }}
            >
              <Label htmlFor="rename-team">Team name</Label>
              <Input
                id="rename-team"
                name="name"
                defaultValue={rename.name}
                required
                maxLength={64}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={change.isPending}
                  onClick={() => setRename(null)}
                >
                  Cancel
                </Button>
                <Button disabled={change.isPending}>
                  {change.isPending ? "Saving…" : "Save name"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
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
                if (confirm)
                  change.mutate({ hackathonId, change: confirm.change });
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
