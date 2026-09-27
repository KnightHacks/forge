"use client";

import { MarkdownContent } from "@forge/ui/markdown-content";
import { Skeleton } from "@forge/ui/skeleton";

import { api } from "~/trpc/react";

const MANAGED_SOURCE =
  /^\/_managed\/issue-images\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function ManagedIssueImage({
  alt,
  attachmentId,
}: {
  alt: string;
  attachmentId: string;
}) {
  const download = api.issues.getImageDownload.useQuery({ attachmentId });
  if (download.isPending) {
    return <Skeleton className="aspect-video w-full max-w-3xl rounded-md" />;
  }
  if (download.isError || !download.data.url) {
    return (
      <span className="block rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Managed image could not be loaded.
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private presigned issue media
    <img
      alt={alt}
      className="max-h-[60svh] w-full max-w-3xl rounded-md border border-white/10 object-contain"
      src={download.data.url}
    />
  );
}

export function IssueMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <MarkdownContent
      breaks
      className={className}
      components={{
        img: ({ alt = "", src }) => {
          const match =
            typeof src === "string" ? MANAGED_SOURCE.exec(src) : null;
          const attachmentId = match?.[1];
          return attachmentId ? (
            <ManagedIssueImage alt={alt} attachmentId={attachmentId} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- author-provided Markdown image
            <img alt={alt} src={src} />
          );
        },
      }}
    >
      {children}
    </MarkdownContent>
  );
}
