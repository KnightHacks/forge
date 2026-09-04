"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import {
  checkUploadMetadata,
  ISSUE_IMAGE_UPLOAD_POLICY,
  uploadAccept,
} from "@forge/validators";

import type { ManagedImageReference } from "./issue-managed-images";
import { api } from "~/trpc/react";
import {
  managedImageReferences,
  managedImageUploadFileName,
  safeManagedImageAlt,
} from "./issue-managed-images";
import { IssueMarkdown } from "./issue-markdown";

type UploadTarget =
  | { draftKey: string; mode: "draft"; teamId: string }
  | { issueId: string; mode: "issue" };

function uploadTargetKey(target: UploadTarget) {
  return target.mode === "draft"
    ? `${target.mode}:${target.draftKey}:${target.teamId}`
    : `${target.mode}:${target.issueId}`;
}

function ManagedImageList({
  images,
  remove,
  updateAlt,
}: {
  images: ManagedImageReference[];
  remove: (image: ManagedImageReference) => void;
  updateAlt: (image: ManagedImageReference, alt: string) => void;
}) {
  if (images.length === 0) return null;
  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3">
      <p className="text-sm font-medium">
        Managed images ·{" "}
        {new Set(images.map(({ attachmentId }) => attachmentId)).size}/10
      </p>
      {images.map((image) => (
        <div
          className="grid gap-2 rounded-md border border-white/10 bg-card/50 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
          key={`${image.attachmentId}-${image.start}`}
        >
          <Input
            aria-label="Image alt text"
            maxLength={500}
            value={image.alt}
            onChange={(event) => {
              const alt = safeManagedImageAlt(event.target.value);
              if (alt.trim().length > 0) updateAlt(image, alt);
            }}
          />
          <Button
            aria-label={`Remove ${image.alt || "issue image"}`}
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => remove(image)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

export function IssueDescriptionEditor({
  id,
  onChange,
  preview,
  required = true,
  setPreview,
  uploadTarget,
  value,
}: {
  id: string;
  onChange: (value: string) => void;
  preview: boolean;
  required?: boolean;
  setPreview: (value: boolean) => void;
  uploadTarget: UploadTarget;
  value: string;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ end: value.length, start: value.length });
  const latestValue = useRef(value);
  latestValue.current = value;
  const latestUploadTargetKey = useRef(uploadTargetKey(uploadTarget));
  latestUploadTargetKey.current = uploadTargetKey(uploadTarget);
  const uploadInFlight = useRef(false);
  const [uploading, setUploading] = useState(false);
  const createUpload = api.issues.createImageUpload.useMutation();
  const finalizeUpload = api.issues.finalizeImageUpload.useMutation();
  const images = managedImageReferences(value);

  function rememberSelection() {
    if (!textarea.current) return;
    selection.current = {
      end: textarea.current.selectionEnd,
      start: textarea.current.selectionStart,
    };
  }

  async function upload(file: File) {
    if (uploadInFlight.current) {
      toast.error("Wait for the current image upload to finish.");
      return;
    }
    const check = checkUploadMetadata(ISSUE_IMAGE_UPLOAD_POLICY, {
      contentType: file.type,
      fileName: file.name,
      size: file.size,
    });
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    if (new Set(images.map(({ attachmentId }) => attachmentId)).size >= 10) {
      toast.error("Issues may contain at most 10 managed images.");
      return;
    }
    uploadInFlight.current = true;
    setUploading(true);
    const startedForTarget = uploadTargetKey(uploadTarget);
    const fileName = managedImageUploadFileName(
      file.name,
      check.type.extensions[0],
    );
    try {
      const intent = await createUpload.mutateAsync({
        ...uploadTarget,
        contentType: file.type,
        fileName,
        size: file.size,
      });
      const result = await fetch(intent.uploadUrl, {
        body: file,
        headers: { "Content-Type": intent.contentType },
        method: "PUT",
      });
      if (!result.ok) throw new Error("Image upload failed.");
      await finalizeUpload.mutateAsync({ attachmentId: intent.attachmentId });
      if (latestUploadTargetKey.current !== startedForTarget) {
        toast.info("The owning team changed. Add the image again.");
        return;
      }
      const alt =
        safeManagedImageAlt(file.name.replace(/\.[^.]+$/, "")).trim() ||
        "Issue image";
      const markdown = `![${alt}](/_managed/issue-images/${intent.attachmentId})`;
      const { end, start } = selection.current;
      const currentValue = latestValue.current;
      const prefix = currentValue.slice(0, start);
      const suffix = currentValue.slice(end);
      const leftBreak =
        prefix.length > 0 && !prefix.endsWith("\n") ? "\n\n" : "";
      const rightBreak =
        suffix.length > 0 && !suffix.startsWith("\n") ? "\n\n" : "";
      const next = `${prefix}${leftBreak}${markdown}${rightBreak}${suffix}`;
      latestValue.current = next;
      onChange(next);
      const cursor = prefix.length + leftBreak.length + markdown.length;
      selection.current = { end: cursor, start: cursor };
      requestAnimationFrame(() => {
        textarea.current?.focus();
        textarea.current?.setSelectionRange(cursor, cursor);
      });
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Image upload failed.",
      );
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  }

  function replaceReference(image: ManagedImageReference, replacement: string) {
    const currentValue = latestValue.current;
    const next = `${currentValue.slice(0, image.start)}${replacement}${currentValue.slice(image.end)}`;
    latestValue.current = next;
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>Description</Label>
        <div className="flex flex-wrap items-center gap-2">
          {!preview && (
            <Button asChild size="sm" type="button" variant="outline">
              <label className="cursor-pointer" htmlFor={`${id}-image`}>
                {uploading ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                )}
                Add image
                <input
                  id={`${id}-image`}
                  type="file"
                  accept={uploadAccept(ISSUE_IMAGE_UPLOAD_POLICY)}
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    rememberSelection();
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </Button>
          )}
          <div className="flex rounded-md border border-white/10 bg-card/60 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={!preview ? "secondary" : "ghost"}
              onClick={() => setPreview(false)}
            >
              Write
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preview ? "secondary" : "ghost"}
              onClick={() => setPreview(true)}
            >
              Preview
            </Button>
          </div>
        </div>
      </div>
      {preview ? (
        <div className="min-h-40 rounded-md border border-white/10 bg-card/50 p-4">
          <IssueMarkdown>{value || "Nothing to preview yet."}</IssueMarkdown>
        </div>
      ) : (
        <Textarea
          ref={textarea}
          id={id}
          value={value}
          required={required}
          maxLength={20_000}
          rows={8}
          onBlur={rememberSelection}
          onClick={rememberSelection}
          onKeyUp={rememberSelection}
          onChange={(event) => {
            latestValue.current = event.target.value;
            onChange(event.target.value);
          }}
          onDragOver={(event) => {
            if (
              [...event.dataTransfer.items].some((item) => item.kind === "file")
            ) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            const file = event.dataTransfer.files[0];
            if (!file) return;
            event.preventDefault();
            rememberSelection();
            void upload(file);
          }}
          onPaste={(event) => {
            const file = event.clipboardData.files[0];
            if (!file) return;
            event.preventDefault();
            rememberSelection();
            void upload(file);
          }}
        />
      )}
      {!preview && (
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, WebP, or GIF up to 10MB. Paste or drop an image to insert
          it at the cursor.
        </p>
      )}
      <ManagedImageList
        images={images}
        remove={(image) => replaceReference(image, "")}
        updateAlt={(image, alt) =>
          replaceReference(
            image,
            `![${safeManagedImageAlt(alt)}](/_managed/issue-images/${image.attachmentId})`,
          )
        }
      />
    </div>
  );
}
