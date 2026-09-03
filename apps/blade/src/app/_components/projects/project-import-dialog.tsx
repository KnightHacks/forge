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
  challengeCount: number;
  collapsedDuplicateRows: number;
  excludedDraftProjects: number;
  importedProjects: number;
  memberCount: number;
  rejectedProjects: number;
  rejections: { project: string; reason: string }[];
}

export function ProjectImportDialog({
  hackathonId,
  hackathonName,
  onImported,
  projectCount,
}: {
  hackathonId: string;
  hackathonName: string;
  onImported: () => void;
  projectCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
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
      toast.success(`${payload.importedProjects} projects imported.`);
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
      <DialogTrigger asChild>
        <Button className="h-11 gap-2">
          <Upload className="size-4" aria-hidden="true" />
          Import Devpost CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Replace {hackathonName} projects</DialogTitle>
          <DialogDescription>
            Import submitted Devpost projects and derive this hackathon&apos;s
            challenge list. Drafts and incomplete projects are ignored.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert>
              <FileSpreadsheet className="size-4" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                {result.importedProjects} projects, {result.memberCount} team
                members, and {result.challengeCount} challenges were imported.
              </AlertDescription>
            </Alert>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Drafts excluded", result.excludedDraftProjects],
                ["Duplicates collapsed", result.collapsedDuplicateRows],
                ["Projects rejected", result.rejectedProjects],
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
            {projectCount > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>This replaces the current inventory</AlertTitle>
                <AlertDescription>
                  All {projectCount} current projects—including soft-deleted
                  projects—and the current challenge list will be removed before
                  the new file is inserted. Manual edits will be overwritten.
                </AlertDescription>
              </Alert>
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
              <Button disabled={!file || submitting} onClick={submit}>
                {submitting ? "Importing…" : "Replace and import"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
