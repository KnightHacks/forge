"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Database, Pencil, RotateCcw, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
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

import type { ProjectDirectoryInput } from "./project-directory";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";
import { ProjectDirectory } from "./project-directory";
import { ProjectImportDialog } from "./project-import-dialog";
import { ProjectMembersEditor } from "./project-members-editor";

type AdminData = RouterOutputs["projects"]["listAdmin"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];
type Project = AdminData["projects"][number];

function splitValues(value: FormDataEntryValue | null, newlineOnly = false) {
  return formString(value)
    .split(newlineOnly ? /\r?\n/ : /[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function projectUpdateFromForm(project: Project, form: FormData) {
  const memberNames = form.getAll("memberName").map(formString);
  const memberEmails = form.getAll("memberEmail").map(formString);
  const members = memberNames.map((name, index) => ({
    email: memberEmails[index] ?? "",
    name,
  }));
  return {
    challengeIds: form.getAll("challengeIds").map(formString),
    demoLinks: splitValues(form.get("demoLinks"), true),
    description: formString(form.get("description")),
    members,
    participantCount: Number(formString(form.get("participantCount"))),
    projectId: project.id,
    submissionUrl: formString(form.get("submissionUrl")),
    technologies: splitValues(form.get("technologies")),
    title: formString(form.get("title")),
    universities: splitValues(form.get("universities")),
    videoUrl: formString(form.get("videoUrl")).trim() || null,
  };
}

function ProjectEditDialog({
  challenges,
  onSaved,
  onOpenChange,
  project,
}: {
  challenges: AdminData["challenges"];
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}) {
  const update = api.projects.update.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = new FormData(event.currentTarget);
    try {
      await update.mutateAsync(projectUpdateFromForm(project, form));
      toast.success("Project updated.");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        {project ? (
          <form className="space-y-5" onSubmit={submit}>
            <DialogHeader className="text-left">
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>
                Changes are visible in the judge directory immediately and may
                be replaced by the next CSV import.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-title">Title</Label>
                <Input
                  defaultValue={project.title}
                  id="project-title"
                  name="title"
                  required
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-url">Devpost URL</Label>
                <Input
                  defaultValue={project.submissionUrl}
                  id="project-url"
                  name="submissionUrl"
                  required
                  type="url"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-description">
                  About the project (optional)
                </Label>
                <Textarea
                  className="min-h-40"
                  defaultValue={project.description}
                  id="project-description"
                  name="description"
                />
              </label>
              <label className="space-y-2">
                <Label htmlFor="project-participants">Participant count</Label>
                <Input
                  defaultValue={project.participantCount}
                  id="project-participants"
                  max={100}
                  min={1}
                  name="participantCount"
                  required
                  type="number"
                />
              </label>
              <label className="space-y-2">
                <Label htmlFor="project-video">Video URL</Label>
                <Input
                  defaultValue={project.videoUrl ?? ""}
                  id="project-video"
                  name="videoUrl"
                  type="url"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-demo-links">Demo links</Label>
                <Textarea
                  defaultValue={project.demoLinks.join("\n")}
                  id="project-demo-links"
                  name="demoLinks"
                  placeholder="One URL per line"
                />
              </label>
              <label className="space-y-2">
                <Label htmlFor="project-technologies">Technologies</Label>
                <Textarea
                  defaultValue={project.technologies.join(", ")}
                  id="project-technologies"
                  name="technologies"
                />
              </label>
              <label className="space-y-2">
                <Label htmlFor="project-universities">Schools</Label>
                <Textarea
                  defaultValue={project.universities.join(", ")}
                  id="project-universities"
                  name="universities"
                />
              </label>
              <ProjectMembersEditor
                key={project.id}
                members={project.members}
              />
            </div>

            <fieldset className="space-y-3 rounded-lg border border-border/70 p-4">
              <legend className="px-1 text-sm font-semibold">Challenges</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {challenges.map((challenge) => {
                  const checked = project.challenges.some(
                    (selected) => selected.id === challenge.id,
                  );
                  return (
                    <label
                      className="flex min-h-10 items-center gap-3"
                      key={challenge.id}
                    >
                      {challenge.label === "General" ? (
                        <>
                          <input
                            checked
                            className="size-4 accent-primary"
                            disabled
                            readOnly
                            type="checkbox"
                          />
                          <input
                            name="challengeIds"
                            type="hidden"
                            value={challenge.id}
                          />
                        </>
                      ) : (
                        <input
                          defaultChecked={checked}
                          className="size-4 accent-primary"
                          name="challengeIds"
                          type="checkbox"
                          value={challenge.id}
                        />
                      )}
                      <span className="text-sm">{challenge.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={update.isPending} type="submit">
                {update.isPending ? "Saving…" : "Save project"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectStateDialog({
  onComplete,
  onOpenChange,
  project,
}: {
  onComplete: () => void;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}) {
  const remove = api.projects.delete.useMutation();
  const restore = api.projects.restore.useMutation();
  const isRestore = Boolean(project?.deletedAt);
  const pending = remove.isPending || restore.isPending;

  async function confirm() {
    if (!project) return;
    try {
      if (isRestore) await restore.mutateAsync({ projectId: project.id });
      else await remove.mutateAsync({ projectId: project.id });
      toast.success(isRestore ? "Project restored." : "Project deleted.");
      onOpenChange(false);
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{isRestore ? "Restore" : "Delete"} project?</DialogTitle>
          <DialogDescription>
            {isRestore
              ? `${project?.title ?? "This project"} will return to the judge directory with its existing challenge and team associations.`
              : `${project?.title ?? "This project"} will be hidden from judges. Officers can restore this soft-deleted project later.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            variant={isRestore ? "primary" : "destructive"}
          >
            {pending ? "Working…" : isRestore ? "Restore" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminProjectWorkspace({
  data,
  hackathons,
  input,
}: {
  data: AdminData | null;
  hackathons: Hackathons;
  input:
    | (ProjectDirectoryInput & {
        deleted: "active" | "all" | "deleted";
        hackathonId: string;
      })
    | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Project | null>(null);
  const [changingState, setChangingState] = useState<Project | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function navigate(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <main className={adminPageLayoutClassName} aria-busy={pending}>
      <AdminPageHeader
        actions={
          data && input ? (
            <ProjectImportDialog
              hackathonId={input.hackathonId}
              hackathonName={data.hackathon.displayName}
              onImported={refresh}
              projectCount={
                hackathons.find(
                  (hackathon) => hackathon.id === input.hackathonId,
                )?.projectCount ?? 0
              }
            />
          ) : null
        }
        description="Replace a hackathon’s Devpost inventory, review import results, and make targeted corrections without exposing project management to judges."
        eyebrow="Officer tools"
        icon={Database}
        title="Project import"
      />

      {data && input ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-card/80 p-4 shadow-xl shadow-black/10 sm:flex-row sm:items-end sm:justify-between">
            <label className="min-w-0 space-y-2">
              <span className="block text-sm font-medium">Hackathon</span>
              <select
                aria-label="Manage hackathon projects"
                className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm sm:min-w-72"
                onChange={(event) =>
                  navigate({
                    challenge: undefined,
                    hackathon: event.target.value,
                  })
                }
                value={input.hackathonId}
              >
                {hackathons.map((hackathon) => (
                  <option key={hackathon.id} value={hackathon.id}>
                    {hackathon.displayName} ({hackathon.projectCount})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium">Inventory state</span>
              <select
                aria-label="Project inventory state"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => navigate({ deleted: event.target.value })}
                value={input.deleted}
              >
                <option value="active">Active projects</option>
                <option value="deleted">Deleted projects</option>
                <option value="all">All projects</option>
              </select>
            </label>
          </section>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{data.totalCount} in this view</Badge>
            <Badge variant="outline">{data.challenges.length} challenges</Badge>
          </div>

          <ProjectDirectory
            actions={(project) => (
              <>
                {!project.deletedAt ? (
                  <Button
                    aria-label={`Edit ${project.title}`}
                    onClick={() => setEditing(project)}
                    size="sm"
                    variant="outline"
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                  </Button>
                ) : null}
                <Button
                  aria-label={`${project.deletedAt ? "Restore" : "Delete"} ${project.title}`}
                  onClick={() => setChangingState(project)}
                  size="sm"
                  variant={project.deletedAt ? "outline" : "ghost"}
                >
                  {project.deletedAt ? (
                    <RotateCcw className="size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  <span className="sr-only sm:not-sr-only sm:ml-1">
                    {project.deletedAt ? "Restore" : "Delete"}
                  </span>
                </Button>
              </>
            )}
            data={data}
            input={input}
          />

          <ProjectEditDialog
            challenges={data.challenges}
            onOpenChange={(open) => !open && setEditing(null)}
            onSaved={refresh}
            project={editing}
          />
          <ProjectStateDialog
            onComplete={refresh}
            onOpenChange={(open) => !open && setChangingState(null)}
            project={changingState}
          />
        </>
      ) : (
        <Alert>
          <Database className="size-4" />
          <AlertTitle>No hackathons configured</AlertTitle>
          <AlertDescription>
            Create a hackathon before importing a Devpost project export.
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
