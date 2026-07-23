"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  FileStack,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
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
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { issueTemplateCreateSchema } from "@forge/validators";

import type { IssueTeamChoice, IssueTemplateChoice } from "./types";
import { api } from "~/trpc/react";

interface TemplateNode {
  children: TemplateNode[];
  description: string;
  name: string;
  priority: (typeof ISSUE.PRIORITY)[number];
  relativeDueDays?: number;
  status: (typeof ISSUE.ISSUE_STATUS)[number];
}

interface TemplatePayloadNode extends Omit<TemplateNode, "children"> {
  children: TemplatePayloadNode[];
  team: string;
}

function newNode(name = "{INPUT}"): TemplateNode {
  return {
    children: [],
    description: "",
    name,
    priority: "Medium",
    status: "Backlog",
  };
}

function updateNode(
  node: TemplateNode,
  path: number[],
  change: (current: TemplateNode) => TemplateNode,
): TemplateNode {
  const [head, ...rest] = path;
  if (head === undefined) return change(node);
  return {
    ...node,
    children: node.children.map((child, index) =>
      index === head ? updateNode(child, rest, change) : child,
    ),
  };
}

function removeNode(node: TemplateNode, path: number[]): TemplateNode {
  const [head, ...rest] = path;
  if (head === undefined) return node;
  if (rest.length === 0) {
    return {
      ...node,
      children: node.children.filter((_, index) => index !== head),
    };
  }
  return {
    ...node,
    children: node.children.map((child, index) =>
      index === head ? removeNode(child, rest) : child,
    ),
  };
}

function countNodes(node: TemplateNode): number {
  return (
    1 + node.children.reduce((total, child) => total + countNodes(child), 0)
  );
}

function bodyNodeCount(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const children = (body as { children?: unknown }).children;
  if (!Array.isArray(children)) return 1;
  const childCounts = children.map(bodyNodeCount);
  if (childCounts.some((count) => count === null)) return null;
  return (
    1 + childCounts.reduce<number>((total, count) => total + (count ?? 0), 0)
  );
}

function TemplateNodeEditor({
  depth,
  node,
  onAddChild,
  onChange,
  onRemove,
  root,
}: {
  depth: number;
  node: TemplateNode;
  onAddChild: () => void;
  onChange: (node: TemplateNode) => void;
  onRemove: () => void;
  root: boolean;
}) {
  return (
    <section
      className={cn(
        "border-l-2 pl-3",
        root ? "border-primary" : "ml-3 border-white/15 sm:ml-6",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant={root ? "default" : "outline"}>
          {root ? "Root" : `Level ${depth}`}
        </Badge>
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {node.name || "Untitled issue"}
        </p>
        {!root && (
          <Button
            aria-label="Remove template issue"
            className="ml-auto h-9 w-9"
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 grid gap-3 rounded-md border border-white/10 bg-background/50 p-3">
        <div className="grid gap-2">
          <Label>Title pattern</Label>
          <Input
            value={node.name}
            placeholder="Prepare {INPUT}"
            onChange={(event) =>
              onChange({ ...node, name: event.target.value })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label>Description · Markdown</Label>
          <Textarea
            value={node.description}
            placeholder="Context for {PARENT}"
            rows={3}
            onChange={(event) =>
              onChange({ ...node, description: event.target.value })
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>Status</Label>
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={node.status}
              onChange={(event) =>
                onChange({
                  ...node,
                  status: event.target.value as TemplateNode["status"],
                })
              }
            >
              {ISSUE.ISSUE_STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={node.priority}
              onChange={(event) =>
                onChange({
                  ...node,
                  priority: event.target.value as TemplateNode["priority"],
                })
              }
            >
              {ISSUE.PRIORITY.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Due after days</Label>
            <Input
              type="number"
              min={-365}
              max={3650}
              placeholder="No due date"
              value={node.relativeDueDays ?? ""}
              onChange={(event) =>
                onChange({
                  ...node,
                  relativeDueDays:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </div>
        </div>
        {depth < 5 && (
          <Button
            className="justify-self-start"
            onClick={onAddChild}
            type="button"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add child
          </Button>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="mt-3 grid gap-3">
          {node.children.map((child, index) => (
            <TemplateNodeEditor
              depth={depth + 1}
              key={index}
              node={child}
              onAddChild={() =>
                onChange(
                  updateNode(node, [index], (current) => ({
                    ...current,
                    children: [
                      ...current.children,
                      newNode("{PARENT}: next step"),
                    ],
                  })),
                )
              }
              onChange={(next) =>
                onChange(updateNode(node, [index], () => next))
              }
              onRemove={() => onChange(removeNode(node, [index]))}
              root={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function withTeam(node: TemplateNode, team: string): TemplatePayloadNode {
  return {
    ...node,
    children: node.children.map((child) => withTeam(child, team)),
    team,
  };
}

function fromStoredBody(body: unknown): TemplateNode | null {
  const parsed = issueTemplateCreateSchema.safeParse({ name: "Stored", body });
  if (!parsed.success) return null;
  const convert = (node: typeof parsed.data.body): TemplateNode => ({
    children: (node.children ?? []).map(convert),
    description: node.description,
    name: node.name,
    priority: node.priority,
    relativeDueDays: node.relativeDueDays,
    status: node.status,
  });
  return convert(parsed.data.body);
}

export function TemplateCatalogDialog({
  canManage,
  onClose,
  open,
  teams,
  templates,
}: {
  canManage: boolean;
  onClose: () => void;
  open: boolean;
  teams: IssueTeamChoice[];
  templates: IssueTemplateChoice[];
}) {
  const router = useRouter();
  const editableTeams = teams.filter((item) => item.canEdit);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState(editableTeams[0]?.id ?? "");
  const [root, setRoot] = useState<TemplateNode>(() => newNode());
  const create = api.issues.createTemplate.useMutation();
  const update = api.issues.updateTemplate.useMutation();
  const disable = api.issues.disableTemplate.useMutation();

  function resetBuilder() {
    setEditingId(null);
    setName("");
    setTeam(editableTeams[0]?.id ?? "");
    setRoot(newNode());
  }

  function editTemplate(template: IssueTemplateChoice) {
    const stored = fromStoredBody(template.body);
    if (!stored) {
      toast.error(
        "This legacy template needs data repair before it can be edited.",
      );
      return;
    }
    const body = template.body as { team?: string };
    setEditingId(template.id);
    setName(template.name);
    setTeam(
      editableTeams.some((item) => item.id === body.team)
        ? (body.team ?? "")
        : (editableTeams[0]?.id ?? ""),
    );
    setRoot(stored);
  }

  async function save() {
    const parsed = issueTemplateCreateSchema.safeParse({
      body: withTeam(root, team),
      name,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check the template fields.",
      );
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({
          body: parsed.data.body,
          id: editingId,
          name: parsed.data.name,
        });
        toast.success("Template updated.");
      } else {
        await create.mutateAsync({
          body: parsed.data.body,
          name: parsed.data.name,
        });
        toast.success("Template created.");
      }
      resetBuilder();
      router.refresh();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Template could not be saved.",
      );
    }
  }

  async function disableTemplate(template: IssueTemplateChoice) {
    try {
      await disable.mutateAsync({ id: template.id });
      toast.success("Template disabled. Existing issues were not changed.");
      if (editingId === template.id) resetBuilder();
      router.refresh();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Template could not be disabled.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 h-[100svh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92svh] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2">
        <DialogHeader className="border-b border-white/10 bg-card/95 px-4 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileStack className="h-5 w-5 text-primary" />
            Issue templates
          </DialogTitle>
          <DialogDescription>
            Reusable Club-wide issue trees. INPUT is the launch value; PARENT is
            the resolved parent title.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-white/10 bg-card/55 p-3 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2 px-1 pb-3">
              <p className="text-sm font-semibold">
                Catalog · {templates.length}
              </p>
              {canManage && (
                <Button size="sm" variant="outline" onClick={resetBuilder}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              )}
            </div>
            <div className="grid gap-2">
              {templates.map((template) => {
                const nodeCount = bodyNodeCount(template.body);
                return (
                  <article
                    key={template.id}
                    className="rounded-md border border-white/10 bg-background/60 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{template.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {nodeCount ?? "Invalid"} issue
                          {nodeCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      {template.disabledAt && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                    {template.disabledReason && (
                      <p className="mt-2 flex gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {template.disabledReason}
                      </p>
                    )}
                    {canManage && (
                      <div className="mt-3 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editTemplate(template)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {!template.disabledAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void disableTemplate(template)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Disable
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {templates.length === 0 && (
                <p className="rounded-md border border-dashed border-white/15 p-5 text-center text-sm text-muted-foreground">
                  No templates yet.
                </p>
              )}
            </div>
          </aside>
          <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
            {canManage ? (
              <div className="grid gap-4">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase text-primary">
                    Template builder
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {editingId ? `Edit ${name || "template"}` : "New template"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Define the catalog entry once, then build its issue tree
                    below.
                  </p>
                </div>
                <div className="grid gap-3 border-l-2 border-primary bg-background/35 px-4 py-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="template-name">Catalog name</Label>
                    <Input
                      id="template-name"
                      value={name}
                      placeholder="Program launch"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="template-team">Owning team default</Label>
                    <select
                      id="template-team"
                      value={team}
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) => setTeam(event.target.value)}
                    >
                      {editableTeams.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <TemplateNodeEditor
                  depth={1}
                  node={root}
                  onAddChild={() =>
                    setRoot((current) => ({
                      ...current,
                      children: [
                        ...current.children,
                        newNode("{PARENT}: next step"),
                      ],
                    }))
                  }
                  onChange={setRoot}
                  onRemove={() => undefined}
                  root
                />
                <p className="text-sm text-muted-foreground">
                  {countNodes(root)} of 100 issues · maximum depth 5
                </p>
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center text-center">
                <div>
                  <FileStack className="mx-auto h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-semibold">Template catalog</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    You can apply enabled templates while creating an issue.
                    Template editing requires its separate role permission.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="border-t border-white/10 bg-card/95 p-3 sm:p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canManage && (
            <Button
              disabled={create.isPending || update.isPending || !team}
              onClick={() => void save()}
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingId ? "Save changes" : "Create template"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
