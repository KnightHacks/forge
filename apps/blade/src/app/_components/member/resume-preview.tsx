import { ExternalLink, FileText } from "lucide-react";

import { cn } from "@forge/ui";

export function ResumePreview({
  className,
  fileName,
  src,
}: {
  className?: string;
  fileName: string;
  src: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <FileText
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="truncate">{fileName}</span>
        </span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Open
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
      <iframe
        className="h-80 w-full bg-muted md:h-[34rem]"
        src={src}
        title={`${fileName} preview`}
      />
    </div>
  );
}
