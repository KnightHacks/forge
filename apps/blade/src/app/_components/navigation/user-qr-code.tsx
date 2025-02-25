import Image from "next/image";
import { QrCode } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { api } from "~/trpc/server";

export function QRCodePopup() {
  const getQR = async () => {
    const userQR = await api.qr.getQRCode();

    if (userQR.qrCodeUrl) {
      return (
        <div className="flex h-[40vw] max-h-[80vh] w-[40vw] items-center justify-center overflow-y-auto">
          <Image
            unoptimized
            src={userQR.qrCodeUrl}
            alt="QR Code"
            width={400}
            height={400}
          />
        </div>
      );
    }

    return <p>No QR Code found</p>;
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          <span>View QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-h-[96vw] !max-w-[96vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-6">
          <div className="rounded-lg bg-white p-4">{getQR()}</div>
        </div>
      </DialogContent>
      <DialogDescription></DialogDescription>
    </Dialog>
  );
}
