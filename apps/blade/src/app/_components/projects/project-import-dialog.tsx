"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface ImportResult {
  addOnly: boolean;
  challengeCount: number;
  collapsedDuplicateRows: number;
  excludedDraftProjects: number;
  importedProjects: number;
  memberCount: number;
  newChallengeCount: number;
  rejectedProjects: number;
  rejections: { project: string; reason: string }[];
  skippedProjects: number;
}

export function ProjectImportDialog({
  hackathonId,
  hackathonName,
  inventoryLocked,
  onImported,
  projectCount,
}: {
  hackathonId: string;
  hackathonName: string;
  inventoryLocked: boolean;
  onImported: () => void;
  projectCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<"automatic" | "replace">("automatic");
  const [confirmation, setConfirmation] = useState("");

  function reset() {
    setFile(null);
    setResult(null);
    setConfirmation("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("The CSV must be 25 MiB or smaller.");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("hackathonId", hackathonId);
      body.set("mode", mode);
      if (mode === "replace") body.set("confirmation", confirmation);
      const response = await fetch("/api/admin/projects/import", {
        body,
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | (ImportResult & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(
          payload?.error ??
            (response.status === 413
              ? "The CSV must be 25 MiB or smaller."
              : "Import failed."),
        );
      }
      setResult(payload);
      toast.success(
        payload.addOnly
          ? `${payload.importedProjects} new projects added.`
          : `${payload.importedProjects} projects imported.`,
      );
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (submitting && !nextOpen) return;
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <DialogTrigger asChild>
          <Button className="h-11 gap-2" onClick={() => setMode("automatic")}>
            <Upload className="size-4" aria-hidden="true" />
            {inventoryLocked ? "Add new projects" : "Import Devpost CSV"}
          </Button>
        </DialogTrigger>
        {inventoryLocked ? (
          <DialogTrigger asChild>
            <Button
              className="h-11"
              onClick={() => setMode("replace")}
              variant="destructive"
            >
              Replace inventory
            </Button>
          </DialogTrigger>
        ) : null}
      </div>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>
            {mode === "replace"
              ? `Destructive replacement for ${hackathonName}`
              : inventoryLocked
                ? `Add new ${hackathonName} projects`
                : `Import ${hackathonName} projects`}
          </DialogTitle>
          <DialogDescription>
            {mode === "replace"
              ? "Replace the project inventory and revoke every active guest judging session."
              : inventoryLocked
                ? "Only projects with unseen Devpost URLs are added. Existing records and room access stay unchanged."
                : "Import submitted Devpost projects and derive this hackathon's challenge list. Drafts and incomplete projects are ignored."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert>
              <FileSpreadsheet className="size-4" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                {result.importedProjects} projects and {result.memberCount} team
                members were imported. {result.skippedProjects} known projects
                were left unchanged.
              </AlertDescription>
            </Alert>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Drafts excluded", result.excludedDraftProjects],
                ["Duplicates collapsed", result.collapsedDuplicateRows],
                ["Projects rejected", result.rejectedProjects],
                ["New challenges", result.newChallengeCount],
              ].map(([label, value]) => (
                <div
                  className="rounded-md border border-border/70 p-3"
                  key={label}
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {result.rejections.length ? (
              <div className="max-h-40 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <h3 className="text-sm font-semibold">Rejected records</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {result.rejections.map((rejection, index) => (
                    <li key={`${rejection.project}-${index}`}>
                      {rejection.project}: {rejection.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {mode === "replace" && projectCount > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>This replaces the current inventory</AlertTitle>
                <AlertDescription>
                  All {projectCount} current projects, including soft-deleted
                  projects, will be replaced. Active room QRs and guest sessions
                  will be revoked. A replacement that removes an active
                  room&apos;s challenge is blocked.
                </AlertDescription>
              </Alert>
            ) : null}
            {mode === "replace" && inventoryLocked ? (
              <div className="space-y-2">
                <Label htmlFor="project-import-confirmation">
                  Type {hackathonName} to confirm
                </Label>
                <Input
                  id="project-import-confirmation"
                  onChange={(event) => setConfirmation(event.target.value)}
                  value={confirmation}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="devpost-project-file">Devpost CSV</Label>
              <Input
                accept=".csv,text/csv"
                id="devpost-project-file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                ref={inputRef}
                type="file"
              />
              <p className="text-xs text-muted-foreground">
                CSV only, up to 25 MiB. Raw upload contents are never written to
                the audit log.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button
                disabled={submitting}
                onClick={() => setOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !file ||
                  submitting ||
                  (mode === "replace" &&
                    inventoryLocked &&
                    confirmation !== hackathonName)
                }
                onClick={submit}
                variant={mode === "replace" ? "destructive" : "primary"}
              >
                {submitting
                  ? "Importing…"
                  : mode === "replace"
                    ? "Revoke access and replace"
                    : inventoryLocked
                      ? "Add unseen projects"
                      : "Import projects"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
