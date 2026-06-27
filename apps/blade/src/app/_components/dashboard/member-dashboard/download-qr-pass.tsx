"use client";

import { useState } from "react";
import { Loader2, WalletCards } from "lucide-react";

import type { ButtonProps } from "@forge/ui/button";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type PassProfileKind = "member" | "hacker";

export function DownloadQRPass({
  buttonClassName,
  iconClassName,
  profile,
  profileKind = "member",
  size = "sm",
}: {
  buttonClassName?: string;
  iconClassName?: string;
  profile?: { firstName?: string | null; lastName?: string | null } | null;
  profileKind?: PassProfileKind;
  size?: ButtonProps["size"];
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const generatePass = api.passkit.generatePass.useMutation({
    onSuccess: (data) => {
      try {
        if (!data.success || !data.passBuffer || !data.fileName) {
          toast.error("Invalid pass data received");
          setIsDownloading(false);
          return;
        }

        // Convert base64 to blob
        const byteCharacters = atob(data.passBuffer);
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
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Apple Wallet pass downloaded successfully!");
      } catch (error) {
        // TODO: look into not logging into the console
        console.error("Error downloading pass:", error); // eslint-disable-line no-console
        toast.error("Failed to download pass");
      } finally {
        setIsDownloading(false);
      }
    },
    onError: (error: { message?: string }) => {
      // TODO: look into not logging into the console
      console.error("Error generating pass:", error); // eslint-disable-line no-console
      toast.error(error.message ?? "Failed to generate pass");
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    if (profile && (!profile.firstName || !profile.lastName)) {
      toast.error("Missing profile information");
      return;
    }

    setIsDownloading(true);
    generatePass.mutate({ kind: profileKind });
  };

  // canDownload allows !profile because handleDownload delegates validation to generatePass.mutate.
  const canDownload =
    !profile || Boolean(profile.firstName && profile.lastName);

  return (
    <Button
      size={size}
      className={
        buttonClassName ??
        "w-full gap-2 border bg-card text-card-foreground transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-card hover:shadow-md group-hover:text-primary"
      }
      onClick={handleDownload}
      disabled={!canDownload || isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2
            className={
              iconClassName
                ? `${iconClassName} animate-spin`
                : "h-4 w-4 animate-spin"
            }
          />
          Generating Pass...
        </>
      ) : canDownload ? (
        <>
          <WalletCards className={iconClassName ?? "h-4 w-4"} />
          Apple Wallet
        </>
      ) : (
        "No profile information found"
      )}
    </Button>
  );
}
