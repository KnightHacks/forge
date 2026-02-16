"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";

import { Button } from "@forge/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@forge/ui/drawer";

export function FormQRCodeDialog({
  formSlug,
  trigger,
}: {
  formSlug: string;
  trigger?: React.ReactNode;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const formUrl =
    typeof window !== "undefined"
      ? // make the qr a url to the form forms/<slug name of form>
        `${window.location.origin}/forms/${encodeURIComponent(formSlug)}`
      : "";

  useEffect(() => {
    if (!formUrl) return;

    void (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(formUrl, {
          width: 400,
          margin: 2,
        });

        setQrUrl(dataUrl);
      } catch {
        setQrUrl(null);
      }
    })();
  }, [formUrl]);

  const content = (
    <div className="flex items-center justify-center p-6">
      {qrUrl && (
        <div className="rounded-lg bg-white p-4">
          <Image src={qrUrl} alt="Form QR Code" width={200} height={200} />
        </div>
      )}
    </div>
  );

  const triggerNode = trigger ?? (
    <Button size="sm" variant="secondary" className="gap-2">
      <QrCode className="h-4 w-4" />
    </Button>
  );

  return (
    <>
      {/* two for desktop and mobile :p */}
      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger asChild>{triggerNode}</DrawerTrigger>
          <DrawerContent className="mx-auto w-full max-w-sm">
            {content}
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden md:block">
        <Dialog>
          <DialogTrigger asChild>{triggerNode}</DialogTrigger>
          <DialogContent className="max-w-lg">{content}</DialogContent>
        </Dialog>
      </div>
    </>
  );
}
