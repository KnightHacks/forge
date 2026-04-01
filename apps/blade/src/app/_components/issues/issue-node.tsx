"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";

import type { Hackathon, Role } from "./issue-form-fields";
import {
  addChildToTreeNode,
  defaultEventForm,
  getTaskDueDateInputValue,
  normalizeTaskDueDate,
  removeTreeNode,
  updateTreeNode,
} from "./issue-dialog-utils";
import {
  EventFormFields,
  PrioritySelect,
  RoleCheckboxGroup,
  StatusSelect,
  TeamSelect,
} from "./issue-form-fields";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function newIssueNode(
  overrides: Partial<ISSUE.IssueEditNode> = {},
): ISSUE.IssueEditNode {
  return {
    clientId: crypto.randomUUID(),
    status: ISSUE.ISSUE_STATUS[0],
    name: "",
    description: "",
    links: [],
    date: normalizeTaskDueDate(),
    priority: ISSUE.PRIORITY[0],
    team: "",
    isEvent: false,
    eventData: undefined,
    roles: [],
    assigneeIds: [],
    children: [],
    ...overrides,
  };
}

export function updateIssueNode(
  nodes: ISSUE.IssueEditNode[],
  clientId: string,
  patch: Partial<ISSUE.IssueEditNode>,
): ISSUE.IssueEditNode[] {
  return updateTreeNode(nodes, clientId, patch, (n) => n.clientId);
}

export function removeIssueNode(
  nodes: ISSUE.IssueEditNode[],
  clientId: string,
): ISSUE.IssueEditNode[] {
  return removeTreeNode(nodes, clientId, (n) => n.clientId);
}

export function addChildToIssueNode(
  nodes: ISSUE.IssueEditNode[],
  parentClientId: string,
): ISSUE.IssueEditNode[] {
  return addChildToTreeNode(
    nodes,
    parentClientId,
    newIssueNode(),
    (n) => n.clientId,
  );
}

export function validateIssueNodes(
  nodes: ISSUE.IssueEditNode[],
): boolean {
  return nodes.every(
    (n) =>
      n.name.trim().length > 0 &&
      n.team.trim().length > 0 &&
      n.description.trim().length > 0 &&
      validateIssueNodes(n.children),
  );
}

// ─── IssueNode ────────────────────────────────────────────────────────────────

interface IssueNodeProps {
  node: ISSUE.IssueEditNode;
  depth: number;
  roles: Role[];
  hackathons: Hackathon[];
  onUpdate: (clientId: string, patch: Partial<ISSUE.IssueEditNode>) => void;
  onRemove: (clientId: string) => void;
  onAddChild: (parentClientId: string) => void;
}

export function IssueNode({
  node,
  depth,
  roles,
  hackathons,
  onUpdate,
  onRemove,
  onAddChild,
}: IssueNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const baseId = useId();

  const update = <K extends keyof ISSUE.IssueEditNode>(
    key: K,
    value: ISSUE.IssueEditNode[K],
  ) =>
    onUpdate(node.clientId, {
      [key]: value,
    } as Partial<ISSUE.IssueEditNode>);

  const updateEvent = <K extends keyof ISSUE.EventFormValues>(
    key: K,
    value: ISSUE.EventFormValues[K],
  ) => {
    onUpdate(node.clientId, {
      eventData: { ...(node.eventData ?? defaultEventForm()), [key]: value },
    });
  };

  return (
    <div className={cn("mt-2", depth > 0 && "ml-4 border-l pl-4")}>
      {/* Header row */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Input
          className="h-7 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
          placeholder="Sub-issue name (required)"
          value={node.name}
          onChange={(e) => update("name", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(node.clientId)}
          aria-label="Remove sub-issue"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-2 space-y-4 rounded-md border bg-background px-4 py-4">
          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Status</Label>
            <StatusSelect
              className="col-span-3 w-full"
              value={node.status}
              onValueChange={(v) => update("status", v)}
            />
          </div>

          {/* Priority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Priority</Label>
            <PrioritySelect
              className="col-span-3 w-full"
              value={node.priority}
              onValueChange={(v) => update("priority", v)}
            />
          </div>

          {/* Team */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Team</Label>
            <TeamSelect
              className="col-span-3 w-full"
              value={node.team}
              onValueChange={(v) => update("team", v)}
              roles={roles}
            />
          </div>

          {/* Is Event */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Is Event?</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                checked={node.isEvent}
                onCheckedChange={(checked) => {
                  const nextIsEvent = checked === true;
                  onUpdate(node.clientId, {
                    isEvent: nextIsEvent,
                    eventData: nextIsEvent
                      ? (node.eventData ?? defaultEventForm())
                      : undefined,
                  });
                }}
              />
            </div>
          </div>

          {/* Date/Time fields */}
          {node.isEvent && node.eventData ? (
            <EventFormFields
              eventData={node.eventData}
              hackathons={hackathons}
              baseId={baseId}
              onChange={updateEvent}
            />
          ) : (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor={`${baseId}-due-date`}
                className="text-right text-sm"
              >
                Due Date
              </Label>
              <Input
                id={`${baseId}-due-date`}
                type="date"
                className="col-span-3 w-full"
                value={getTaskDueDateInputValue(node.date)}
                onChange={(e) =>
                  update("date", normalizeTaskDueDate(e.target.value))
                }
              />
            </div>
          )}

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label
              htmlFor={`${baseId}-description`}
              className="pt-2 text-right text-sm"
            >
              {node.isEvent ? "Internal Description" : "Description"}
            </Label>
            <Textarea
              id={`${baseId}-description`}
              className="col-span-3 min-h-[100px] w-full resize-none"
              placeholder="Description..."
              value={node.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {node.isEvent && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label
                htmlFor={`${baseId}-ext-description`}
                className="pt-2 text-right text-sm"
              >
                External Description
              </Label>
              <Textarea
                id={`${baseId}-ext-description`}
                className="col-span-3 min-h-[100px] w-full resize-none"
                placeholder="Public-facing event description..."
                value={node.eventData?.description ?? ""}
                onChange={(e) => updateEvent("description", e.target.value)}
              />
            </div>
          )}

          {/* Issue Visibility */}
          <RoleCheckboxGroup
            label="Visible To Roles"
            roles={roles}
            selectedIds={node.roles}
            onChange={(ids) => update("roles", ids)}
            description="Teams who can see and manage this sub-issue"
          />

          {node.isEvent && (
            <RoleCheckboxGroup
              label="Event Visible To Roles"
              roles={roles}
              selectedIds={node.eventData?.roles ?? []}
              onChange={(ids) => updateEvent("roles", ids)}
              description="Teams who can see and join the event"
              keyPrefix="event-role-"
            />
          )}

          {/* Add nested child issue */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddChild(node.clientId)}
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Sub-issue
            </Button>
          </div>
        </div>
      )}

      {/* Children */}
      {node.children.map((child) => (
        <IssueNode
          key={child.clientId}
          node={child}
          depth={depth + 1}
          roles={roles}
          hackathons={hackathons}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

// ─── IssueTemplate helpers ────────────────────────────────────────────────────

export function newIssueTemplateNode(
  overrides: Partial<ISSUE.IssueTemplateEditNode> = {},
): ISSUE.IssueTemplateEditNode {
  return {
    clientId: crypto.randomUUID(),
    name: "",
    description: "",
    team: "",
    daysOffset: undefined,
    children: [],
    ...overrides,
  };
}

export function updateIssueTemplateNode(
  nodes: ISSUE.IssueTemplateEditNode[],
  clientId: string,
  patch: Partial<ISSUE.IssueTemplateEditNode>,
): ISSUE.IssueTemplateEditNode[] {
  return updateTreeNode(nodes, clientId, patch, (n) => n.clientId);
}

export function removeIssueTemplateNode(
  nodes: ISSUE.IssueTemplateEditNode[],
  clientId: string,
): ISSUE.IssueTemplateEditNode[] {
  return removeTreeNode(nodes, clientId, (n) => n.clientId);
}

export function addChildToIssueTemplateNode(
  nodes: ISSUE.IssueTemplateEditNode[],
  parentClientId: string,
): ISSUE.IssueTemplateEditNode[] {
  return addChildToTreeNode(
    nodes,
    parentClientId,
    newIssueTemplateNode(),
    (n) => n.clientId,
  );
}

export function validateIssueTemplateNodes(
  nodes: ISSUE.IssueTemplateEditNode[],
): boolean {
  return nodes.every(
    (n) =>
      n.name.trim().length > 0 && validateIssueTemplateNodes(n.children),
  );
}

// ─── IssueTemplateNode ────────────────────────────────────────────────────────

interface IssueTemplateNodeProps {
  node: ISSUE.IssueTemplateEditNode;
  depth: number;
  roles: Role[];
  hideRemove?: boolean;
  onUpdate: (
    clientId: string,
    patch: Partial<ISSUE.IssueTemplateEditNode>,
  ) => void;
  onRemove: (clientId: string) => void;
  onAddChild: (parentClientId: string) => void;
}

export function IssueTemplateNode({
  node,
  depth,
  roles,
  hideRemove,
  onUpdate,
  onRemove,
  onAddChild,
}: IssueTemplateNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const baseId = useId();

  const update = <K extends keyof ISSUE.IssueTemplateEditNode>(
    key: K,
    value: ISSUE.IssueTemplateEditNode[K],
  ) =>
    onUpdate(node.clientId, {
      [key]: value,
    } as Partial<ISSUE.IssueTemplateEditNode>);

  return (
    <div className={cn("mt-2", depth > 0 && "ml-4 border-l pl-4")}>
      {/* Header row */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Input
          className="h-7 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
          placeholder="Sub-task name (required)"
          value={node.name}
          onChange={(e) => update("name", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        {!hideRemove && (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(node.clientId)}
            aria-label="Remove sub-task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-2 space-y-4 rounded-md border bg-background px-4 py-4">
          {/* Days Offset */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor={`${baseId}-days-offset`}
              className="text-right text-sm"
            >
              Days Offset
            </Label>
            <div className="col-span-3 flex items-center gap-3">
              <Input
                id={`${baseId}-days-offset`}
                type="number"
                className="w-32"
                placeholder="e.g. 3"
                value={node.daysOffset ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  update("daysOffset", val === "" ? undefined : Number(val));
                }}
              />
              <span className="text-sm text-muted-foreground">
                days before parent due date
              </span>
            </div>
          </div>

          {/* Team */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Team</Label>
            <TeamSelect
              className="col-span-3 w-full"
              value={node.team}
              onValueChange={(v) => update("team", v)}
              roles={roles}
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label
              htmlFor={`${baseId}-description`}
              className="pt-2 text-right text-sm"
            >
              Description
            </Label>
            <Textarea
              id={`${baseId}-description`}
              className="col-span-3 min-h-[100px] w-full resize-none"
              placeholder="Description..."
              value={node.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {/* Add nested sub-task */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddChild(node.clientId)}
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Sub-task
            </Button>
          </div>
        </div>
      )}

      {/* Children */}
      {node.children.map((child) => (
        <IssueTemplateNode
          key={child.clientId}
          node={child}
          depth={depth + 1}
          roles={roles}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}
