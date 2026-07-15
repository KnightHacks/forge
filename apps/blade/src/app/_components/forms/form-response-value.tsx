"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

interface FileAnswer {
  attachmentId: string;
  fileName: string;
}

interface LegacyFileAnswer {
  fileName: string;
  formId: string;
  legacyObjectName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFileAnswer(value: unknown): FileAnswer | null {
  return isRecord(value) &&
    typeof value.attachmentId === "string" &&
    typeof value.fileName === "string"
    ? { attachmentId: value.attachmentId, fileName: value.fileName }
    : null;
}

function asLegacyFileAnswer(value: unknown): LegacyFileAnswer | null {
  return isRecord(value) &&
    typeof value.fileName === "string" &&
    typeof value.formId === "string" &&
    typeof value.legacyObjectName === "string"
    ? {
        fileName: value.fileName,
        formId: value.formId,
        legacyObjectName: value.legacyObjectName,
      }
    : null;
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function formatFormResponseValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatFormResponseValue).filter(Boolean).join(", ");
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "Saved response";
  if (!isRecord(value)) return "Saved response";

  if (typeof value.label === "string" || typeof value.label === "number") {
    return String(value.label);
  }
  if (value.kind === "other") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.value === "string") return value.value;
  }
  if (typeof value.fileName === "string") return value.fileName;
  if (typeof value.value === "string" || typeof value.value === "number") {
    return String(value.value);
  }

  const readableValues = Object.entries(value)
    .filter(
      ([key]) =>
        !["attachmentId", "id", "kind", "optionId", "questionId"].includes(key),
    )
    .map(([, entry]) => formatFormResponseValue(entry))
    .filter((entry) => entry !== "—");
  return readableValues.join(", ") || "Saved response";
}

export function FormAttachmentDownload({ attachmentId, fileName }: FileAnswer) {
  const [downloading, setDownloading] = useState(false);
  const download = api.forms.getAttachmentDownload.useQuery(
    { attachmentId },
    { enabled: false },
  );

  async function startDownload() {
    setDownloading(true);
    try {
      const result = await download.refetch();
      if (!result.data?.url)
        throw new Error("A download link was not returned.");
      const anchor = document.createElement("a");
      anchor.href = result.data.url;
      anchor.download = fileName;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) {
      toast.error("File download failed", {
        description:
          cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      className="h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left"
      data-form-attachment-download="available"
      disabled={downloading}
      onClick={() => void startDownload()}
      type="button"
      variant="outline"
    >
      {downloading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 break-all">{fileName}</span>
    </Button>
  );
}

function LegacyFormAttachmentDownload({
  fileName,
  formId,
  legacyObjectName,
}: LegacyFileAnswer) {
  const [downloading, setDownloading] = useState(false);
  const download = api.forms.getLegacyAttachmentDownload.useQuery(
    { formId, objectName: legacyObjectName },
    { enabled: false },
  );

  async function startDownload() {
    setDownloading(true);
    try {
      const result = await download.refetch();
      if (!result.data?.url)
        throw new Error("A download link was not returned.");
      const anchor = document.createElement("a");
      anchor.href = result.data.url;
      anchor.download = fileName;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) {
      toast.error("File download failed", {
        description:
          cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      className="h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left"
      data-form-attachment-download="legacy"
      disabled={downloading}
      onClick={() => void startDownload()}
      type="button"
      variant="outline"
    >
      {downloading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 break-all">{fileName}</span>
    </Button>
  );
}

export function FormResponseValue({
  questionType,
  value,
}: {
  questionType?: string;
  value: unknown;
}) {
  const file = asFileAnswer(value);
  if (file) return <FormAttachmentDownload {...file} />;
  const legacyFile = asLegacyFileAnswer(value);
  if (legacyFile) return <LegacyFormAttachmentDownload {...legacyFile} />;

  const link = questionType === "link" ? safeHttpUrl(value) : null;
  if (link) {
    return (
      <a
        className="inline-flex min-h-11 max-w-full items-center gap-2 break-all text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-form-response-link="clickable"
        href={link}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="min-w-0 break-all">{String(value)}</span>
        <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
      </a>
    );
  }

  return <>{formatFormResponseValue(value)}</>;
}
