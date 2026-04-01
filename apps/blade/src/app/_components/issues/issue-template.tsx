"use client";

import { type FormEvent, useState } from "react";
import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

import { TeamSelect } from "./issue-form-fields";
import {
  addChildToTemplateSubIssueNode,
  newTemplateSubIssueNode,
  removeTemplateSubIssueNode,
  TemplateSubIssueNode,
  updateTemplateSubIssueNode,
  validateTemplateSubIssueNodes,
} from "./sub-issue-node";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredTemplate {
  id: string;
  name: string;
  body: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function fromTemplateSubIssue(
  s: ISSUE.TemplateSubIssue,
): ISSUE.TemplateSubIssueEditNode {
  return {
    clientId: crypto.randomUUID(),
    name: s.title,
    description: s.description ?? "",
    team: s.team ?? "",
    daysOffset:
      s.dateMs !== undefined ? Math.round(s.dateMs / 86400000) : undefined,
    children: (s.children ?? []).map(fromTemplateSubIssue),
  };
}

function toTemplateSubIssue(
  n: ISSUE.TemplateSubIssueEditNode,
): ISSUE.TemplateSubIssue {
  const issue: ISSUE.TemplateSubIssue = { title: n.name };
  if (n.description) issue.description = n.description;
  if (n.team) issue.team = n.team;
  if (n.daysOffset !== undefined) issue.dateMs = n.daysOffset * 86400000;
  if (n.children.length > 0) issue.children = n.children.map(toTemplateSubIssue);
  return issue;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IssueTemplate() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingTemplate, setEditingTemplate] =
    useState<StoredTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [rootNodes, setRootNodes] = useState<ISSUE.TemplateSubIssueEditNode[]>(
    [],
  );

  const utils = api.useUtils();

  const { data: templates = [], isLoading } = api.issues.getTemplates.useQuery(
    undefined,
    { enabled: isOpen },
  );

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    error: rolesError,
  } = api.roles.getAllLinks.useQuery(undefined, { enabled: isOpen });

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
    setRootNodes([newTemplateSubIssueNode()]);
    setView("form");
  }

  function openEdit(t: StoredTemplate) {
    setEditingTemplate(t);
    setTemplateName(t.name);
    const body = t.body as ISSUE.TemplateSubIssue[];
    setRootNodes(
      Array.isArray(body)
        ? body.map(fromTemplateSubIssue)
        : [newTemplateSubIssueNode()],
    );
    setView("form");
  }

  // ── Tree mutation callbacks ──

  function handleUpdate(
    clientId: string,
    patch: Partial<ISSUE.TemplateSubIssueEditNode>,
  ) {
    setRootNodes((prev) => updateTemplateSubIssueNode(prev, clientId, patch));
  }

  function handleRemove(clientId: string) {
    setRootNodes((prev) => removeTemplateSubIssueNode(prev, clientId));
  }

  function handleAddChild(parentClientId: string) {
    setRootNodes((prev) =>
      addChildToTemplateSubIssueNode(prev, parentClientId),
    );
  }

  // ── Root node helpers ──

  const root = rootNodes[0];
  function updateRoot(patch: Partial<ISSUE.TemplateSubIssueEditNode>) {
    if (root) handleUpdate(root.clientId, patch);
  }

  // ── Save ──

  const isFormValid =
    templateName.trim().length > 0 && validateTemplateSubIssueNodes(rootNodes);
  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid || isSaving) return;

    const body = rootNodes.map(toTemplateSubIssue);

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

      <DialogContent className="flex max-h-[70vh] w-full max-w-[800px] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-12">
          <p className="text-xs font-medium text-muted-foreground">
            {view === "list"
              ? "Templates"
              : editingTemplate
                ? "Edit Template"
                : "New Template"}
          </p>
          <DialogTitle className="mt-1 text-lg font-semibold">
            {view === "list"
              ? "Issue Templates"
              : editingTemplate
                ? "Update the template details below"
                : "Enter the template details below"}
          </DialogTitle>
        </DialogHeader>

        {/* ── List view ── */}
        {view === "list" && (
          <>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Loading templates…
                </p>
              )}
              {!isLoading && templates.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
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
            <div className="shrink-0 border-t px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Form view ── */}
        {view === "form" && (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleFormSubmit}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-6">
                {/* Template Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Template Name</Label>
                  <Input
                    className="col-span-3 w-full"
                    placeholder="e.g. Workshop flow"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                {/* Root task fields – always visible */}
                {root && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Task Name</Label>
                      <Input
                        className="col-span-3 w-full"
                        placeholder="Task name (required)"
                        value={root.name}
                        onChange={(e) => updateRoot({ name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="pt-2 text-right">Description</Label>
                      <Textarea
                        className="col-span-3 w-full min-h-[100px] resize-none"
                        placeholder="Description..."
                        value={root.description}
                        onChange={(e) => updateRoot({ description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Days Offset</Label>
                      <div className="col-span-3 flex items-center gap-3">
                        <Input
                          type="number"
                          className="w-32"
                          placeholder="e.g. 3"
                          value={root.daysOffset ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateRoot({ daysOffset: val === "" ? undefined : Number(val) });
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          days before parent due date
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Team</Label>
                      <TeamSelect
                        className="col-span-3 w-full"
                        value={root.team}
                        onValueChange={(v) => updateRoot({ team: v })}
                        roles={roles}
                        isLoading={isRolesLoading}
                        error={rolesError}
                      />
                    </div>

                    {/* Sub-tasks of the root task */}
                    <div className="border-t pt-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Sub-tasks</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddChild(root.clientId)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add Sub-task
                        </Button>
                      </div>
                      {root.children.length === 0 && (
                        <p className="text-sm text-muted-foreground">No sub-tasks yet.</p>
                      )}
                      {root.children.map((child) => (
                        <TemplateSubIssueNode
                          key={child.clientId}
                          node={child}
                          depth={0}
                          roles={roles}
                          onUpdate={handleUpdate}
                          onRemove={handleRemove}
                          onAddChild={handleAddChild}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="border"
                  onClick={goToList}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !isFormValid}
                >
                  {isSaving
                    ? "Saving…"
                    : editingTemplate
                      ? "Save Changes"
                      : "Create Template"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
