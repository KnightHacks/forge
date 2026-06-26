"use client";

import { useState } from "react";
import { FileCheck2, Loader2, UploadCloud, X } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";

import { ResumePreview } from "~/app/_components/member/resume-preview";
import { useObjectPreviewUrl } from "~/hooks/use-object-preview-url";
import { api } from "~/trpc/react";

const MAX_RESUME_SIZE = 5 * 1000000;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Resume could not be read."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Resume could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

export function MemberResumeUpload({
  className,
  initialResumeUrl,
  onChange,
  saveMode = "member",
  variant = "panel",
}: {
  className?: string;
  initialResumeUrl: string | null;
  onChange?: (resumeUrl: string) => void;
  saveMode?: "deferred" | "member";
  variant?: "compact" | "panel";
}) {
  const [resumeUrl, setResumeUrl] = useState(initialResumeUrl ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewFile] = useObjectPreviewUrl();

  const savedResume = api.resume.getResume.useQuery(undefined, {
    enabled:
      saveMode === "member" &&
      isViewerOpen &&
      Boolean(resumeUrl) &&
      !previewUrl,
    staleTime: 60 * 1000,
  });
  const uploadResume = api.resume.uploadResume.useMutation();
  const updateResume = api.resume.saveMemberResume.useMutation({
    onSuccess(member) {
      setResumeUrl(member.resumeUrl ?? "");
    },
    onError(error) {
      setUploadError(error.message || "Resume could not be saved.");
    },
  });

  const isPending =
    uploadResume.isPending || (saveMode === "member" && updateResume.isPending);

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (file.type !== "application/pdf" && extension !== "pdf") {
      setUploadError("Resume must be a PDF.");
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      setUploadError("Resume must be 5MB or smaller.");
      return;
    }

    setFileName(file.name);
    setPreviewFile(file);

    try {
      const fileContent = await fileToDataUrl(file);
      const objectName = await uploadResume.mutateAsync({
        fileContent,
        fileName: file.name,
      });

      if (saveMode === "deferred") {
        setResumeUrl(objectName);
        onChange?.(objectName);
        setIsViewerOpen(true);
        return;
      }

      await updateResume.mutateAsync({ resumeUrl: objectName });
      setIsViewerOpen(true);
    } catch (error) {
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError("Resume upload failed.");
      }
      setPreviewFile(null);
    }
  };

  const previewSource = previewUrl ?? savedResume.data?.url ?? null;
  const previewFileName = fileName ?? "Resume";
  const canViewResume = Boolean(resumeUrl || previewUrl);
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canViewResume}
          >
            View
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-5xl overflow-hidden rounded-lg p-0 sm:max-h-[88svh]">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle>Resume</DialogTitle>
            <DialogDescription>
              Preview the PDF attached to your member profile.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(100svh-6rem)] overflow-y-auto p-1 sm:max-h-[calc(88svh-5rem)] sm:p-4">
            {resumeUrl && savedResume.isFetching && !previewUrl && (
              <div className="flex h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading resume preview
              </div>
            )}

            {previewSource && (
              <ResumePreview fileName={previewFileName} src={previewSource} />
            )}

            {resumeUrl && savedResume.isError && !previewUrl && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Preview unavailable. Your resume is still saved.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <label
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition hover:bg-primary/90 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
        )}
        {resumeUrl ? "Replace" : "Upload"}
        <Input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={isPending}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
          }}
        />
      </label>

      {resumeUrl && !isPending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={async () => {
            setUploadError(null);
            try {
              if (saveMode === "deferred") {
                setFileName(null);
                setResumeUrl("");
                setPreviewFile(null);
                setIsViewerOpen(false);
                onChange?.("");
                return;
              }

              await updateResume.mutateAsync({ resumeUrl: "" });
              setFileName(null);
              setResumeUrl("");
              setPreviewFile(null);
              setIsViewerOpen(false);
            } catch {
              setUploadError("Resume could not be removed.");
            }
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        {controls}
        {uploadError && (
          <p className="text-sm font-medium text-destructive">{uploadError}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 rounded-md border border-dashed border-primary/35 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileCheck2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">PDF resume</p>
            <p className="text-sm text-muted-foreground">
              Upload or replace the PDF attached to your profile.
            </p>
          </div>
        </div>

        {controls}
      </div>

      {uploadError && (
        <p className="text-sm font-medium text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
