"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutTemplate,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditingNode extends Omit<ISSUE.TemplateSubIssue, "children"> {
  id: string;
  children: EditingNode[];
}

interface Team {
  id: string;
  name: string;
}

interface StoredTemplate {
  id: string;
  name: string;
  body: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newNode(overrides: Partial<EditingNode> = {}): EditingNode {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    children: [],
    ...overrides,
  };
}

function fromSubIssue(s: ISSUE.TemplateSubIssue): EditingNode {
  return {
    id: crypto.randomUUID(),
    title: s.title,
    description: s.description ?? "",
    team: s.team,
    assignee: s.assignee,
    dateMs: s.dateMs,
    children: (s.children ?? []).map(fromSubIssue),
  };
}

function toSubIssue(n: EditingNode): ISSUE.TemplateSubIssue {
  const issue: ISSUE.TemplateSubIssue = { title: n.title };
  if (n.description) issue.description = n.description;
  if (n.team) issue.team = n.team;
  if (n.assignee) issue.assignee = n.assignee;
  if (n.dateMs !== undefined) issue.dateMs = n.dateMs;
  if (n.children.length > 0) issue.children = n.children.map(toSubIssue);
  return issue;
}

function updateNode(
  nodes: EditingNode[],
  id: string,
  patch: Partial<EditingNode>,
): EditingNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    return { ...n, children: updateNode(n.children, id, patch) };
  });
}

function removeNode(nodes: EditingNode[], id: string): EditingNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

function addChildTo(nodes: EditingNode[], parentId: string): EditingNode[] {
  return nodes.map((n) => {
    if (n.id === parentId)
      return { ...n, children: [...n.children, newNode()] };
    return { ...n, children: addChildTo(n.children, parentId) };
  });
}

// ─── FormRow ──────────────────────────────────────────────────────────────────

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr] md:gap-x-6 items-start">
      <div className="md:pt-2.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && (
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── SubIssueNode (recursive) ─────────────────────────────────────────────────

interface SubIssueNodeProps {
  node: EditingNode;
  depth: number;
  roles: Team[];
  onUpdate: (id: string, patch: Partial<EditingNode>) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function SubIssueNode({
  node,
  depth,
  roles,
  onUpdate,
  onRemove,
  onAddChild,
}: SubIssueNodeProps) {
  const [expanded, setExpanded] = useState(false);

  const daysOffset =
    node.dateMs !== undefined ? Math.round(node.dateMs / 86400000) : "";

  const selectedTeam = node.team;

  function toggleTeam(roleId: string) {
    onUpdate(node.id, { team: selectedTeam === roleId ? undefined : roleId });
  }

  return (
    <div className={depth > 0 ? "ml-3 border-l pl-3" : ""}>
      <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-4">
        {/* Row: expand toggle + title + remove */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Input
            className="flex-1 rounded-none border-x-0 border-b border-t-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-primary"
            placeholder="Sub-task title (required)"
            value={node.title}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(node.id)}
            className="shrink-0 h-9 w-9 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapsible details — always stacked so nested nodes never overflow */}
        {expanded && (
          <div className="space-y-4 pt-1 border-t">
            {/* Description */}
            <div className="space-y-1.5 pt-3">
              <span className="text-sm font-medium">Description</span>
              <Textarea
                className="min-h-[80px] resize-y"
                placeholder="Optional description"
                value={node.description ?? ""}
                onChange={(e) =>
                  onUpdate(node.id, { description: e.target.value })
                }
              />
            </div>

            {/* Days offset */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Days Offset</span>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="h-10 w-32"
                  placeholder="e.g. 3"
                  value={daysOffset}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdate(node.id, {
                      dateMs:
                        val === "" ? undefined : Number(val) * 86400000,
                    });
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  days before parent due date
                </span>
              </div>
            </div>

            {/* Team multiselect */}
            {roles.length > 0 && (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Assign to Team</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Teams who can manage this sub-task
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTeam === role.id}
                        onCheckedChange={() => toggleTeam(role.id)}
                        className="shrink-0"
                      />
                      <span className="text-sm">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Add sub-task */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onAddChild(node.id)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add nested sub-task
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <SubIssueNode
              key={child.id}
              node={child}
              depth={depth + 1}
              roles={roles}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IssueTemplate() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingTemplate, setEditingTemplate] =
    useState<StoredTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [rootNodes, setRootNodes] = useState<EditingNode[]>([]);

  const utils = api.useUtils();

  const { data: templates = [], isLoading } = api.issues.getTemplates.useQuery(
    undefined,
    { enabled: isOpen },
  );

  const { data: roles = [] } = api.roles.getAllLinks.useQuery(undefined, {
    enabled: isOpen,
  });

  const createTemplate = api.issues.createTemplate.useMutation({
    onSuccess() {
      toast.success("Template created");
      goToList();
    },
    onError(err) {
      toast.error(err.message || "Failed to create template");
    },
    async onSettled() {
      await utils.issues.getTemplates.invalidate();
    },
  });

  const updateTemplate = api.issues.updateTemplate.useMutation({
    onSuccess() {
      toast.success("Template updated");
      goToList();
    },
    onError(err) {
      toast.error(err.message || "Failed to update template");
    },
    async onSettled() {
      await utils.issues.getTemplates.invalidate();
    },
  });

  const deleteTemplate = api.issues.deleteTemplate.useMutation({
    onSuccess() {
      toast.success("Template deleted");
    },
    onError(err) {
      toast.error(err.message || "Failed to delete template");
    },
    async onSettled() {
      await utils.issues.getTemplates.invalidate();
    },
  });

  // ── State helpers ──

  function goToList() {
    setView("list");
    setEditingTemplate(null);
    setTemplateName("");
    setRootNodes([]);
  }

  function openCreate() {
    setEditingTemplate(null);
    setTemplateName("");
    setRootNodes([newNode()]);
    setView("form");
  }

  function openEdit(t: StoredTemplate) {
    setEditingTemplate(t);
    setTemplateName(t.name);
    const body = t.body as ISSUE.TemplateSubIssue[];
    setRootNodes(Array.isArray(body) ? body.map(fromSubIssue) : [newNode()]);
    setView("form");
  }

  // ── Tree mutation callbacks ──

  function handleUpdate(id: string, patch: Partial<EditingNode>) {
    setRootNodes((prev) => updateNode(prev, id, patch));
  }

  function handleRemove(id: string) {
    setRootNodes((prev) => removeNode(prev, id));
  }

  function handleAddChild(parentId: string) {
    setRootNodes((prev) => addChildTo(prev, parentId));
  }

  // ── Save ──

  function handleSave() {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    const hasEmpty = rootNodes.some((n) => !n.title.trim());
    if (hasEmpty) {
      toast.error("All sub-tasks must have a title");
      return;
    }

    const body = rootNodes.map(toSubIssue);

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        name: templateName.trim(),
        body,
      });
    } else {
      createTemplate.mutate({ name: templateName.trim(), body });
    }
  }

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  // ── Render ──

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) goToList();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <LayoutTemplate className="mr-2 h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col w-full h-dvh rounded-none md:rounded-lg md:h-auto md:max-h-[90vh] md:max-w-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b shrink-0">
          <DialogTitle className="text-xl">
            {view === "list"
              ? "Issue Templates"
              : editingTemplate
                ? "Edit Template"
                : "New Template"}
          </DialogTitle>
          {view === "form" && (
            <p className="text-sm text-muted-foreground mt-1">
              Enter the template details below
            </p>
          )}
        </DialogHeader>

        {/* ── List view ── */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Loading templates…
              </p>
            )}
            {!isLoading && templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                No templates yet. Create one to get started.
              </p>
            )}
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <span className="font-medium">{t.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(t)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteTemplate.mutate({ id: t.id })}
                    disabled={deleteTemplate.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Form view ── */}
        {view === "form" && (
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Template name */}
              <FormRow label="Name">
                <Input
                  placeholder="e.g. Workshop flow"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </FormRow>

              {/* Sub-tasks */}
              <FormRow
                label="Sub-tasks"
                hint="Click the arrow to expand details"
              >
                <div className="space-y-3">
                  {rootNodes.map((node) => (
                    <SubIssueNode
                      key={node.id}
                      node={node}
                      depth={0}
                      roles={roles}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onAddChild={handleAddChild}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setRootNodes((prev) => [...prev, newNode()])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add sub-task
                  </Button>
                </div>
              </FormRow>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          {view === "list" ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={goToList} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? "Saving…"
                  : editingTemplate
                    ? "Save Changes"
                    : "Create Template"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
