"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, QrCode } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { api } from "~/trpc/react";

export function MemberQRCodeDialog({
  className,
  triggerClassName,
  variant = "desktop",
}: {
  className?: string;
  triggerClassName?: string;
  variant?: "desktop" | "mobile";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: userQR,
    isError,
    isLoading,
  } = api.qr.getQRCode.useQuery(undefined, {
    enabled: isOpen,
    retry: false,
  });

  const isMobileVariant = variant === "mobile";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={isMobileVariant ? "lg" : "md"}
          variant="primary"
          className={cn(
            "gap-2",
            isMobileVariant ? "h-11 w-full text-sm" : "w-auto",
            triggerClassName,
          )}
        >
          <QrCode className="h-4 w-4" aria-hidden="true" />
          QR code
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-h-[calc(100svh-1rem)] max-w-[min(24rem,calc(100vw-1rem))] p-4 sm:p-6",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle>Your QR code</DialogTitle>
          <DialogDescription>
            This code identifies your Knight Hacks account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-72 items-center justify-center rounded-md border border-white/10 bg-background/60 p-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              Loading QR code
            </div>
          )}

          {isError && (
            <p className="max-w-60 text-center text-sm text-muted-foreground">
              QR code could not load. Close this dialog and try again.
            </p>
          )}

          {userQR?.qrCodeUrl && (
            <div className="rounded-md bg-white p-3 shadow-xl shadow-black/30">
              <Image
                unoptimized
                src={userQR.qrCodeUrl}
                alt="Knight Hacks account QR code"
                width={256}
                height={256}
                className="h-64 w-64"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
