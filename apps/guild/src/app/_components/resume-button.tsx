"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export function ResumeActions({ memberId }: { memberId: string }) {
  const utils = api.useUtils();
  const [pending, setPending] = useState<"attachment" | "inline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openResume = async (disposition: "attachment" | "inline") => {
    const tab =
      disposition === "inline" ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;

    setPending(disposition);
    setError(null);

    try {
      const { url } = await utils.guild.getResumeUrl.fetch({
        disposition,
        memberId,
      });
      if (disposition === "inline" && tab) {
        tab.location.replace(url);
      } else {
        window.location.assign(url);
      }
    } catch (resumeError) {
      tab?.close();
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "The resume could not be opened.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="gap-2"
          disabled={pending !== null}
          onClick={() => openResume("inline")}
        >
          {pending === "inline" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          )}
          Preview resume
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={pending !== null}
          onClick={() => openResume("attachment")}
        >
          {pending === "attachment" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Download
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
