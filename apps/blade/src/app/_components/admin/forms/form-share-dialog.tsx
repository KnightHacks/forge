"use client";

import type { RouterOutputs } from "@forge/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

import { FormShareActions } from "./form-share-actions";

export function FormShareDialog({
  formName,
  onOpenChange,
  open,
  shareAssets,
  slugName,
}: {
  formName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  shareAssets: RouterOutputs["forms"]["getShareAssets"];
  slugName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
          <DialogDescription>
            Copy the stable link or share its QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormShareActions
            canonicalUrl={shareAssets.canonicalUrl}
            formName={formName}
            onCopyLink={() =>
              void navigator.clipboard.writeText(shareAssets.canonicalUrl)
            }
            onOpenQrPreview={() =>
              window.open(
                shareAssets.qrPngDataUrl,
                "_blank",
                "noopener,noreferrer",
              )
            }
            qrPngDataUrl={shareAssets.qrPngDataUrl}
            slugName={slugName}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL QR preview */}
          <img
            src={shareAssets.qrPngDataUrl}
            alt={`QR code for ${formName}`}
            className="mx-auto w-48 rounded-md border border-white/10 bg-white p-2"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
