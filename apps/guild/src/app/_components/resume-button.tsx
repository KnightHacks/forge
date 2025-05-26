"use client";

import { FileText, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

interface Props {
  memberId: string;
}

export function ResumeButton({ memberId }: Props) {
  const resumeMut = api.guild.getGuildResume.useMutation();

  const handleClick = async () => {
    try {
      const { url } = await resumeMut.mutateAsync({ memberId });
      if (!url) throw new Error("No résumé URL from server");

      const tab = window.open(url, "_blank", "noopener,noreferrer");
      if (!tab) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
      alert("Sorry—couldn’t fetch the résumé.");
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleClick}
      disabled={resumeMut.isPending}
      className="text-slate-500 transition hover:text-violet-400 disabled:opacity-50"
      aria-label="Download résumé"
    >
      {resumeMut.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText size={20} />
      )}
    </Button>
  );
}
