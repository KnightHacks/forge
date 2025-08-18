"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function DownloadQRPass() {
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: member } = api.member.getMember.useQuery();

  const generatePass = api.passkit.generatePass.useMutation({
    onSuccess: (data) => {
      try {
        if (!data.success || !data.passBuffer || !data.fileName) {
          toast.error("Invalid pass data received");
          setIsDownloading(false);
          return;
        }

        // Convert base64 to blob
        const byteCharacters = atob(data.passBuffer as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.apple.pkpass",
        });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.fileName as string;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Apple Wallet pass downloaded successfully!");
      } catch (error) {
        console.error("Error downloading pass:", error); // eslint-disable-line no-console
        toast.error("Failed to download pass");
      } finally {
        setIsDownloading(false);
      }
    },
    onError: (error: { message?: string }) => {
      console.error("Error generating pass:", error); // eslint-disable-line no-console
      toast.error(error.message ?? "Failed to generate pass");
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    if (!member?.firstName || !member.lastName) {
      toast.error("Missing member information");
      return;
    }

    setIsDownloading(true);
    generatePass.mutate();
  };

  const canDownload = member?.firstName && member.lastName;

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        className="w-full gap-1"
        onClick={handleDownload}
        disabled={!canDownload || isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Pass...
          </>
        ) : canDownload ? (
          <>
            <Download className="h-4 w-4" />
            Download Apple Wallet Pass
          </>
        ) : (
          "No member information found"
        )}
      </Button>
    </div>
  );
}
