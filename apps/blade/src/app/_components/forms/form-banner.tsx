"use client";

import { Skeleton } from "@forge/ui/skeleton";

import { api } from "~/trpc/react";

export function FormBanner({
  alt,
  attachmentId,
}: {
  alt: string;
  attachmentId: string;
}) {
  const download = api.forms.getAttachmentDownload.useQuery({ attachmentId });

  if (download.isPending) {
    return (
      <Skeleton
        aria-label="Form banner loading"
        className="aspect-[4/1] w-full rounded-none"
      />
    );
  }
  if (download.isError || !download.data.url) {
    return (
      <div className="flex aspect-[4/1] items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground">
        Form banner could not be loaded.
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private presigned form media
    <img
      alt={alt}
      className="aspect-[4/1] w-full object-cover"
      src={download.data.url}
    />
  );
}
