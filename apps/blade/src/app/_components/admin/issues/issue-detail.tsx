"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  History,
  Link2,
  ListTodo,
  Loader2,
  Pencil,
  RotateCcw,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { ISSUE } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
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
import { MarkdownContent } from "@forge/ui/markdown-content";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { defaultIssueDueAt } from "@forge/validators";

import {
  ADMIN_PAGE_EYEBROWS,
  adminPageClassName,
  AdminPageHeader,
  adminPageStackClassName,
} from "~/app/_components/admin/admin-page";
import { api } from "~/trpc/react";

type Detail = RouterOutputs["issues"]["get"];
type HistoryPage = RouterOutputs["issues"]["listHistory"];
type Team = RouterOutputs["issues"]["listTeams"][number];
type EventChoice = RouterOutputs["issues"]["listEvents"][number];

function easternParts(value: Date | null) {
  if (!value) return { date: "", time: ISSUE.TASK_DUE_TIME };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "America/New_York",
      year: "numeric",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function fullDate(value: Date | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(value);
}

function EditIssueDialog({
  detail,
  events,
  onClose,
  teams,
}: {
  detail: Detail;
  events: EventChoice[];
  onClose: () => void;
  teams: Team[];
}) {
  const router = useRouter();
  const due = easternParts(detail.dueAt);
  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description);
  const [status, setStatus] = useState(detail.status);
  const [priority, setPriority] = useState(detail.priority);
  const [dueDate, setDueDate] = useState(due.date);
  const [dueTime, setDueTime] = useState(due.time);
  const [eventId, setEventId] = useState(detail.eventId ?? "");
  const [links, setLinks] = useState(detail.links.join("\n"));
  const [assigneeIds, setAssigneeIds] = useState(
    detail.assignees.map((item) => item.id),
  );
  const [visibleTeamIds, setVisibleTeamIds] = useState(
    detail.visibleTeams.map((team) => team.id),
  );
  const [parentId, setParentId] = useState(detail.parentId ?? "");
  const [preview, setPreview] = useState(false);
  const assignees = api.issues.listAssignees.useQuery({
    teamId: detail.team.id,
  });
  const parentIssues = api.issues.list.useQuery({
    pageSize: 100,
    sortDirection: "asc",
    sortField: "name",
    teamIds: [detail.team.id],
    view: "list",
  });
  const update = api.issues.update.useMutation();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await update.mutateAsync({
        assigneeIds,
        description,
        dueAt: dueDate ? defaultIssueDueAt(dueDate, dueTime) : null,
        eventId: eventId || null,
        expectedRevision: detail.revision,
        id: detail.id,
        links: links
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        name,
        parentId: parentId || null,
        priority,
        status,
        teamVisibilityIds: visibleTeamIds,
      });
      toast.success("Issue updated.");
      onClose();
      router.refresh();
    } catch (cause) {
      const conflict =
        (cause as { data?: { code?: string } } | null)?.data?.code ===
        "CONFLICT";
      toast.error(
        conflict
          ? "A newer change exists. Your unsaved text is still here—copy it, then reload the issue."
          : cause instanceof Error
            ? cause.message
            : "The issue could not be updated.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] max-w-3xl overflow-y-auto border-white/10 bg-card p-0 [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2">
        <DialogHeader className="border-b border-white/10 px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle>Edit issue</DialogTitle>
          <DialogDescription>
            Changes use revision {detail.revision}; stale saves never overwrite
            newer work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid gap-4 p-4 sm:p-6">
            <div className="grid gap-2">
              <Label htmlFor="edit-issue-name">Title</Label>
              <Input
                id="edit-issue-name"
                value={name}
                required
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="edit-issue-description">
                  Description · Markdown
                </Label>
                <div className="flex rounded-md border border-white/10 bg-background/60 p-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={!preview ? "secondary" : "ghost"}
                    onClick={() => setPreview(false)}
                  >
                    Write
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preview ? "secondary" : "ghost"}
                    onClick={() => setPreview(true)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
              {preview ? (
                <div className="min-h-48 rounded-md border border-white/10 bg-background/60 p-4">
                  <MarkdownContent>
                    {description || "Nothing to preview yet."}
                  </MarkdownContent>
                </div>
              ) : (
                <Textarea
                  id="edit-issue-description"
                  value={description}
                  required
                  rows={8}
                  maxLength={20_000}
                  onChange={(event) => setDescription(event.target.value)}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-issue-status">Status</Label>
                <select
                  id="edit-issue-status"
                  value={status}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) =>
                    setStatus(event.target.value as Detail["status"])
                  }
                >
                  {ISSUE.ISSUE_STATUS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-issue-priority">Priority</Label>
                <select
                  id="edit-issue-priority"
                  value={priority}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) =>
                    setPriority(event.target.value as Detail["priority"])
                  }
                >
                  {ISSUE.PRIORITY.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-issue-due-date">Due date</Label>
                <Input
                  id="edit-issue-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-issue-due-time">Due time · Eastern</Label>
                <Input
                  id="edit-issue-due-time"
                  type="time"
                  value={dueTime}
                  disabled={!dueDate}
                  onChange={(event) => setDueTime(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-issue-event">Linked Club event</Label>
              <select
                id="edit-issue-event"
                value={eventId}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setEventId(event.target.value)}
              >
                <option value="">No linked event</option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-issue-parent">Parent issue</Label>
              <select
                id="edit-issue-parent"
                value={parentId}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setParentId(event.target.value)}
              >
                <option value="">No parent</option>
                {(parentIssues.data?.rows ?? [])
                  .filter((item) => item.id !== detail.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Invalid cycles and cross-team parents are rejected atomically.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Assignees</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(assignees.data ?? []).map((person) => (
                  <label
                    key={person.id}
                    className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
                  >
                    <Checkbox
                      checked={assigneeIds.includes(person.id)}
                      onCheckedChange={(checked) =>
                        setAssigneeIds(
                          checked
                            ? [...assigneeIds, person.id]
                            : assigneeIds.filter((id) => id !== person.id),
                        )
                      }
                    />
                    {person.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Shared visibility</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {teams
                  .filter((team) => team.id !== detail.team.id)
                  .map((team) => (
                    <label
                      key={team.id}
                      className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
                    >
                      <Checkbox
                        checked={visibleTeamIds.includes(team.id)}
                        onCheckedChange={(checked) =>
                          setVisibleTeamIds(
                            checked
                              ? [...visibleTeamIds, team.id]
                              : visibleTeamIds.filter((id) => id !== team.id),
                          )
                        }
                      />
                      {team.name}
                    </label>
                  ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-issue-links">
                External links · one per line
              </Label>
              <Textarea
                id="edit-issue-links"
                value={links}
                rows={4}
                onChange={(event) => setLinks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 gap-2 border-t border-white/10 bg-card/95 p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IssueDetail({
  detail,
  events,
  history,
  teams,
}: {
  detail: Detail;
  events: EventChoice[];
  history: HistoryPage;
  teams: Team[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "archive" | "restore" | null
  >(null);
  const [status, setStatus] = useState(detail.status);
  const [historyRows, setHistoryRows] = useState(history.rows);
  const [historyCursor, setHistoryCursor] = useState(history.nextCursor);
  const [historyLoading, setHistoryLoading] = useState(false);
  const utils = api.useUtils();
  const update = api.issues.update.useMutation();
  const archive = api.issues.archive.useMutation();
  const restore = api.issues.restore.useMutation();

  useEffect(() => {
    setHistoryRows(history.rows);
    setHistoryCursor(history.nextCursor);
  }, [history]);

  async function loadOlderHistory() {
    if (!historyCursor || historyLoading) return;
    setHistoryLoading(true);
    try {
      const next = await utils.issues.listHistory.fetch({
        cursor: historyCursor,
        id: detail.id,
        limit: 25,
      });
      setHistoryRows((current) => [...current, ...next.rows]);
      setHistoryCursor(next.nextCursor);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Older history could not be loaded.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function changeStatus(next: Detail["status"]) {
    const prior = status;
    setStatus(next);
    try {
      await update.mutateAsync({
        expectedRevision: detail.revision,
        id: detail.id,
        status: next,
      });
      toast.success(`Moved to ${next}.`);
      router.refresh();
    } catch (cause) {
      setStatus(prior);
      toast.error(
        cause instanceof Error ? cause.message : "Status could not be changed.",
      );
    }
  }

  async function applyArchiveAction() {
    try {
      if (confirmAction === "archive") {
        await archive.mutateAsync({
          expectedRevision: detail.revision,
          id: detail.id,
        });
        toast.success("Issue tree archived.");
        router.push("/admin/issues/archive");
      } else if (confirmAction === "restore" && detail.archiveBatchId) {
        await restore.mutateAsync({
          archiveBatchId: detail.archiveBatchId,
          expectedRevision: detail.revision,
          id: detail.id,
        });
        toast.success("Issue tree restored.");
        setConfirmAction(null);
        router.refresh();
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The issue could not be changed.",
      );
    }
  }

  return (
    <main
      className={`${adminPageClassName} [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2`}
    >
      <div className={adminPageStackClassName}>
        <Button variant="ghost" className="-ml-3" asChild>
          <Link href="/admin/issues/calendar">
            <ArrowLeft className="h-4 w-4" />
            Back to issues
          </Link>
        </Button>
        <AdminPageHeader
          eyebrow={ADMIN_PAGE_EYEBROWS.issueDetail}
          icon={ListTodo}
          title={detail.name}
          titleClassName="break-words"
          description={
            <span className="flex flex-col items-start gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold"
                  style={{ borderColor: detail.team.color ?? "#7c3aed" }}
                >
                  {detail.team.name}
                </span>
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                  {detail.priority}
                </span>
                {detail.archivedAt && (
                  <span className="inline-flex items-center rounded-md border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                    Archived
                  </span>
                )}
              </span>
              <span className="font-mono text-xs">
                Revision {detail.revision} · {detail.id}
              </span>
            </span>
          }
          actions={
            <>
              {!detail.archivedAt && detail.canEdit && (
                <select
                  aria-label="Change issue status"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm font-medium"
                  value={status}
                  onChange={(event) =>
                    void changeStatus(event.target.value as Detail["status"])
                  }
                >
                  {ISSUE.ISSUE_STATUS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              )}
              {detail.canEdit && !detail.archivedAt && (
                <Button
                  className="h-11"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {detail.canEdit && (
                <Button
                  className="h-11"
                  variant="outline"
                  onClick={() =>
                    setConfirmAction(detail.archivedAt ? "restore" : "archive")
                  }
                >
                  {detail.archivedAt ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {detail.archivedAt ? "Restore" : "Archive"}
                </Button>
              )}
            </>
          }
        />

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-lg border border-white/10 bg-card/95 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Operating brief</h2>
              <MarkdownContent className="mt-4 text-sm leading-7 text-muted-foreground">
                {detail.description}
              </MarkdownContent>
            </section>
            {detail.children.length > 0 && (
              <section className="rounded-lg border border-white/10 bg-card/95">
                <header className="border-b border-white/10 px-4 py-3 sm:px-5">
                  <h2 className="font-semibold">Child issues</h2>
                </header>
                <div className="divide-y divide-white/10">
                  {detail.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/admin/issues/${child.id}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-background/55"
                    >
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {child.name}
                      </span>
                      <Badge variant="outline">{child.status}</Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section className="rounded-lg border border-white/10 bg-card/95">
              <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
                <History className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">History</h2>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {historyRows.length}
                  {historyCursor ? "+" : ""}
                </span>
              </header>
              <ol className="divide-y divide-white/10">
                {historyRows.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-4 sm:px-5"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">
                          {entry.actorDisplayName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {entry.action.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.changedFields.length > 0
                          ? entry.changedFields.join(", ")
                          : "History tracking boundary"}
                      </p>
                      <time className="mt-1 block text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
              {historyCursor && (
                <div className="border-t border-white/10 p-3">
                  <Button
                    className="w-full"
                    variant="ghost"
                    disabled={historyLoading}
                    onClick={() => void loadOlderHistory()}
                  >
                    {historyLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Load older history
                  </Button>
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-lg border border-white/10 bg-card/95 p-4">
              <h2 className="font-semibold">Schedule</h2>
              <div className="mt-3 flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {fullDate(detail.dueAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    America/New_York
                  </p>
                </div>
              </div>
              {detail.eventId && (
                <Button className="mt-4 w-full" variant="outline" asChild>
                  <Link href={`/admin/events?event=${detail.eventId}`}>
                    Open linked event
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </section>
            <section className="rounded-lg border border-white/10 bg-card/95 p-4">
              <h2 className="font-semibold">People & visibility</h2>
              <div className="mt-3 flex items-start gap-3">
                <UsersRound className="mt-0.5 h-4 w-4 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">
                    {detail.assignees.length > 0
                      ? detail.assignees.map((item) => item.name).join(", ")
                      : "Owning team"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {detail.visibleTeams.length > 1
                      ? `Shared with ${detail.visibleTeams
                          .filter((team) => team.id !== detail.team.id)
                          .map((team) => team.name)
                          .join(", ")}`
                      : "Not shared outside the team"}
                  </p>
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-white/10 bg-card/95 p-4">
              <h2 className="font-semibold">Hierarchy</h2>
              <div className="mt-3 text-sm">
                {detail.parentId ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/admin/issues/${detail.parentId}`}
                  >
                    Open parent issue
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Root issue</p>
                )}
                <p className="mt-1 text-muted-foreground">
                  {detail.children.length} direct child
                  {detail.children.length === 1 ? "" : "ren"}
                </p>
              </div>
            </section>
            <section className="rounded-lg border border-white/10 bg-card/95 p-4">
              <h2 className="font-semibold">External work</h2>
              <div className="mt-3 grid gap-2">
                {detail.links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 text-sm text-primary hover:border-primary/30"
                  >
                    <Link2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link}</span>
                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
                  </a>
                ))}
                {detail.links.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No external systems linked.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {editOpen && (
        <EditIssueDialog
          detail={detail}
          events={events}
          onClose={() => setEditOpen(false)}
          teams={teams}
        />
      )}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "archive"
                ? "Archive this issue tree?"
                : "Restore this archive batch?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "archive"
                ? "This issue and every currently active descendant will leave ordinary views. They remain recoverable."
                : "Only issues archived in the same batch will be restored."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void applyArchiveAction()}
              disabled={archive.isPending || restore.isPending}
            >
              {(archive.isPending || restore.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {confirmAction === "archive" ? "Archive tree" : "Restore batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
