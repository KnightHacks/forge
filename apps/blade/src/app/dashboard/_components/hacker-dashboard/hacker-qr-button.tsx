"use client";

import Image from "next/image";
import { Loader2, QrCode } from "lucide-react";

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

export function HackerQRCodePopup() {
  const getQR = () => {
    const { data: userQR, isLoading, isError } = api.qr.getQRCode.useQuery();

    if (isError) {
      return (
        <div className="flex h-[40vw] max-h-[80vh] w-[40vw] items-center justify-center overflow-y-auto">
          <div className="text-black">
            Something went wrong. please try again
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-[40vw] max-h-[80vh] w-[40vw] items-center justify-center overflow-y-auto">
          <Loader2 color="#000000" size={50} className="animate-spin" />
        </div>
      );
    }

    if (userQR?.qrCodeUrl) {
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

    return (
      <div className="flex h-[40vw] max-h-[80vh] w-[40vw] items-center justify-center overflow-y-auto">
        <div className="text-black">No QR Code found.</div>
      </div>
    );
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="gap-2 !rounded-none border border-[#1F2937] !bg-white !shadow-none hover:!bg-[#E5E7EB] dark:!bg-[#0A0F1D] dark:hover:!bg-[#1F2937]"
        >
          <QrCode className="h-5 w-5 dark:hidden" color="#000000" />
          <QrCode className="hidden h-5 w-5 dark:block" color="#FFFFFF" />
          <span className="text-lg font-bold text-black dark:text-white">
            QR
          </span>
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
