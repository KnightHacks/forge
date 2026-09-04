"use client";

import { Skeleton } from "@forge/ui/skeleton";

import { api } from "~/trpc/react";

/**
 * Renders one uploaded instruction image/video by attachment id, fetching a
 * presigned download URL. Shared between the respondent form (full-size) and
 * the admin builder's media list (`compact` thumbnail).
 */
export function InstructionMedia({
  alt,
  attachmentId,
  compact = false,
  type,
}: {
  alt: string;
  attachmentId: string;
  compact?: boolean;
  type: "image" | "video";
}) {
  const download = api.forms.getAttachmentDownload.useQuery({ attachmentId });
  const mediaClassName = compact
    ? "h-20 w-32 shrink-0 rounded-md border border-white/10 object-cover"
    : "max-h-[60svh] w-full rounded-md border border-white/10 object-contain sm:max-h-[32rem]";

  if (download.isPending) {
    return (
      <div aria-label="Instruction media loading" aria-busy="true">
        <Skeleton
          className={
            compact
              ? "h-20 w-32 shrink-0 rounded-md"
              : "h-56 w-full rounded-md sm:h-80"
          }
        />
      </div>
    );
  }
  if (download.isError || !download.data.url) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Instruction media could not be loaded.
      </p>
    );
  }
  return type === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element -- private presigned form media
    <img alt={alt} className={mediaClassName} src={download.data.url} />
  ) : (
    <video
      aria-label={alt}
      className={mediaClassName}
      controls
      src={download.data.url}
    />
  );
}
