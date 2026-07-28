"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { DialogFooter } from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import type { IssueSearchInput } from "./params";
import type { IssueWorkspaceData } from "./types";
import { api } from "~/trpc/react";

export function IssueFilters({
  input,
  teams,
}: {
  input: IssueSearchInput;
  teams: IssueWorkspaceData["teams"];
}) {
  const [selectedTeam, setSelectedTeam] = useState(input.teamIds[0] ?? "");
  const assignees = api.issues.listAssignees.useQuery(
    { teamId: selectedTeam },
    { enabled: Boolean(selectedTeam) },
  );
  return (
    <form
      className="grid max-h-[78svh] gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-2"
      method="get"
    >
      {input.calendarMode !== "month" && (
        <input type="hidden" name="mode" value={input.calendarMode} />
      )}
      <input type="hidden" name="date" value={input.calendarDate} />
      {input.sortField !== "dueAt" && (
        <input type="hidden" name="sort" value={input.sortField} />
      )}
      {input.sortDirection !== "asc" && (
        <input type="hidden" name="direction" value={input.sortDirection} />
      )}
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="issues-filter-search"
            name="q"
            defaultValue={input.search}
            className="h-11 pl-9"
            placeholder="Title or description"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-team">Owning team</Label>
        <select
          id="issues-filter-team"
          name="team"
          value={selectedTeam}
          onChange={(event) => setSelectedTeam(event.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Every visible team</option>
          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid gap-2 lg:col-span-2">
        <legend className="text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {ISSUE.ISSUE_STATUS.map((status) => (
            <label
              key={status}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
            >
              <Checkbox
                name="status"
                value={status}
                defaultChecked={input.statuses.includes(status)}
              />
              {status}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2 lg:col-span-2">
        <legend className="text-sm font-medium">Priority</legend>
        <div className="flex flex-wrap gap-2">
          {ISSUE.PRIORITY.map((priority) => (
            <label
              key={priority}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
            >
              <Checkbox
                name="priority"
                value={priority}
                defaultChecked={input.priorities.includes(priority)}
              />
              {priority}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-assignee">Assignee</Label>
        <select
          id="issues-filter-assignee"
          name="assignee"
          defaultValue={input.assigneeIds[0] ?? ""}
          disabled={!selectedTeam}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">Anyone on the selected team</option>
          {(assignees.data ?? []).map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issues-filter-due-from">Due from</Label>
          <Input
            id="issues-filter-due-from"
            name="dueFrom"
            type="date"
            defaultValue={input.dueFrom}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issues-filter-due-to">Due through</Label>
          <Input
            id="issues-filter-due-to"
            name="dueTo"
            type="date"
            defaultValue={input.dueTo}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-event">Club event</Label>
        <select
          id="issues-filter-event"
          name="event"
          defaultValue={input.eventLink}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="any">Linked or unlinked</option>
          <option value="linked">Linked to an event</option>
          <option value="unlinked">No linked event</option>
        </select>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm lg:col-span-2">
        <Checkbox name="root" value="true" defaultChecked={input.rootOnly} />
        Root issues only
      </label>
      <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 gap-2 border-t border-white/10 bg-card/95 p-3 sm:-mx-5 sm:-mb-5 lg:col-span-2">
        <Button className="h-11" variant="outline" asChild>
          <Link href="?">Clear all</Link>
        </Button>
        <Button className="h-11" type="submit">
          Apply filters
        </Button>
      </DialogFooter>
    </form>
  );
}
