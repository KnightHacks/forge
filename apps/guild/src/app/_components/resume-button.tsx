"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { api } from "~/trpc/react";

interface Props {
  memberId: string;
}

export function ResumeButton({ memberId }: Props) {
  const utils = api.useUtils();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      const { url } = await utils.guild.getGuildResume.fetch({ memberId });
      if (!url) throw new Error("No resume URL from server");

      const tab = window.open(url, "_blank", "noopener,noreferrer");
      if (!tab) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      alert(
        `Failed to download Resume. Please try again later: ${error as string}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="text-slate-500 transition hover:text-violet-400 disabled:opacity-50"
      aria-label="View résumé"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText size={20} />
      )}
    </div>
  );
}
