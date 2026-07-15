"use client";

import { Copy, Download, ExternalLink, QrCode } from "lucide-react";

import { Button } from "@forge/ui/button";

export function FormShareActions({
  canonicalUrl,
  formName,
  onCopyLink,
  onOpenQrPreview,
  qrPngDataUrl,
  slugName,
}: {
  canonicalUrl: string;
  formName: string;
  onCopyLink: () => void;
  onOpenQrPreview: () => void;
  qrPngDataUrl: string;
  slugName: string;
}) {
  return (
    <nav
      aria-label="Form sharing"
      data-form-share-layout="responsive"
      className="flex flex-wrap gap-2"
    >
      <Button
        type="button"
        variant="outline"
        className="min-h-11 gap-2 focus-visible:ring-2"
        onClick={onCopyLink}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy link
      </Button>
      <Button
        asChild
        type="button"
        variant="outline"
        className="min-h-11 gap-2 focus-visible:ring-2"
      >
        <a href={canonicalUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open form
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 gap-2 focus-visible:ring-2"
        onClick={onOpenQrPreview}
      >
        <QrCode className="h-4 w-4" aria-hidden="true" />
        QR preview
      </Button>
      <Button
        asChild
        type="button"
        variant="outline"
        className="min-h-11 gap-2 focus-visible:ring-2"
      >
        <a
          href={qrPngDataUrl}
          download={`${slugName}-qr.png`}
          aria-label={`Download QR for ${formName}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download QR
        </a>
      </Button>
    </nav>
  );
}
