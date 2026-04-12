"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { skipToken } from "@tanstack/react-query";
import {
  AlignLeft,
  Calendar,
  CircleDot,
  Copy,
  Eye,
  Link2,
  Loader2,
  Pencil,
  User,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export interface CalendarIssueDialogProps {
  issueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestEdit: (values: Partial<ISSUE.IssueSubmitValues>) => void;
}

type GetIssueResult = RouterOutputs["issues"]["getIssue"];

function isIssueOverdue(
  status: GetIssueResult["status"],
  date: Date | string | null | undefined,
) {
  if (status === "FINISHED" || !date) return false;
  const dueDate = new Date(date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return dueDate < todayStart;
}

function getIssueToEditValues(
  issue: GetIssueResult,
): Partial<ISSUE.IssueSubmitValues> {
  return {
    id: issue.id,
    status: issue.status,
    name: issue.name,
    description: issue.description,
    links: issue.links ?? [],
    date: issue.date ?? undefined,
    priority: issue.priority,
    team: issue.team.id,
    parent: issue.parent ?? undefined,
    isEvent: issue.event !== null,
    event: issue.event,
    teamVisibilityIds: issue.teamVisibility.map((v) => v.teamId),
    assigneeIds: issue.userAssignments.map((a) => a.userId),
  };
}

function DetailRow(props: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-5">
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground">{props.label}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {props.children}
        </div>
      </div>
    </div>
  );
}

export function CalendarIssueDialog({
  issueId,
  open,
  onOpenChange,
  onRequestEdit,
}: CalendarIssueDialogProps) {
  const {
    data: issue,
    isLoading,
    isError,
    error,
  } = api.issues.getIssue.useQuery(
    open && issueId ? { id: issueId } : skipToken,
  );

  function handleEdit() {
    if (!issue) return;
    onRequestEdit(getIssueToEditValues(issue));
    onOpenChange(false);
  }

  async function handleCopyIssueUrl() {
    if (!issue || typeof window === "undefined") return;
    const url = `${window.location.origin}/issues/${issue.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Issue link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[70vh] w-full max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-6 py-4 pr-12 text-left">
          {isLoading ? (
            <>
              <DialogTitle className="sr-only">Loading issue</DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            </>
          ) : isError ? (
            <DialogTitle className="text-base font-semibold text-destructive">
              {error.message}
            </DialogTitle>
          ) : issue ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">Issue</p>
              <DialogTitle
                className="mt-1 text-xl font-bold leading-tight tracking-tight"
                asChild
              >
                <Link
                  href={`/issues/${issue.id}`}
                  className="block text-left text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {issue.name}
                </Link>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Issue details including status, due date, team, and assignees.
              </DialogDescription>
            </>
          ) : (
            <DialogTitle className="text-base font-semibold text-muted-foreground">
              Issue
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            {issue ? (
              <>
                <DetailRow icon={<CircleDot />} label="Status">
                  {issue.status}
                </DetailRow>
                <DetailRow icon={<Calendar />} label="Due Date">
                  {issue.date ? (
                    <span
                      className={
                        isIssueOverdue(issue.status, issue.date)
                          ? "font-medium text-red-900 dark:text-red-500"
                          : undefined
                      }
                    >
                      {new Date(issue.date).toLocaleDateString()}
                    </span>
                  ) : (
                    "No due date"
                  )}
                </DetailRow>
                <DetailRow icon={<Users />} label="Team">
                  {issue.team.name}
                </DetailRow>
                <DetailRow icon={<AlignLeft />} label="Description">
                  {issue.description ? (
                    <span className="whitespace-pre-wrap">
                      {issue.description}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/80">
                      No description
                    </span>
                  )}
                </DetailRow>
                <DetailRow icon={<User />} label="Assignees">
                  {issue.userAssignments.length > 0 ? (
                    <ul className="list-none space-y-1 pl-0">
                      {issue.userAssignments.map((assignment) => (
                        <li key={assignment.userId}>
                          {assignment.user.name ??
                            assignment.user.discordUserId}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "Unassigned"
                  )}
                </DetailRow>
                <DetailRow icon={<Eye />} label="Visible Teams">
                  {issue.teamVisibility.length > 0 ? (
                    <ul className="list-none space-y-1 pl-0">
                      {issue.teamVisibility.map((visibility) => (
                        <li key={visibility.teamId}>{visibility.team.name}</li>
                      ))}
                    </ul>
                  ) : (
                    "No team visibility rules"
                  )}
                </DetailRow>
                <DetailRow icon={<Link2 />} label="Links">
                  {issue.links && issue.links.length > 0 ? (
                    <ul className="list-none space-y-1.5 pl-0">
                      {issue.links.map((link) => (
                        <li key={link}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-4"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No links"
                  )}
                </DetailRow>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={!issue || isLoading}
            onClick={() => void handleCopyIssueUrl()}
          >
            <Copy className="mr-2 size-4" />
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!issue || isLoading}
            onClick={handleEdit}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
