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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@forge/ui/drawer";

import { api } from "~/trpc/react";

export function HackerQRCodePopup() {
  const getQR = () => {
    const { data: userQR, isLoading, isError } = api.qr.getQRCode.useQuery();

    if (isError) {
      return (
        <div className="flex items-center justify-center overflow-y-auto">
          <div className="text-black">
            Something went wrong. please try again
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center overflow-y-auto">
          <Loader2 color="#000000" size={50} className="animate-spin" />
        </div>
      );
    }

    if (userQR?.qrCodeUrl) {
      return (
        <div className="flex items-center justify-center overflow-y-auto">
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
      <div className="flex items-center justify-center overflow-y-auto">
        <div className="text-black">No QR Code found.</div>
      </div>
    );
  };

  const qrTrigger = (
    <Button
      size="lg"
      className="animate-fade-in group w-full gap-2 rounded-lg border border-[#1F2937] bg-card px-5 py-3 shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-card hover:shadow-md sm:px-8"
    >
      <QrCode className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary dark:hidden" />
      <QrCode className="hidden h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary dark:block" />
      <span className="text-base font-bold text-black dark:text-white">QR</span>
    </Button>
  );

  const qrContent = (
    <div className="flex items-center justify-center p-6">
      <div className="rounded-lg bg-white p-4">{getQR()}</div>
    </div>
  );

  return (
    <>
      <div className="w-full sm:w-auto md:hidden">
        <Drawer>
          <DrawerTrigger asChild>{qrTrigger}</DrawerTrigger>
          <DrawerContent className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>
                Your <span className="font-bold text-primary">HACKER</span> QR
                Code
              </DrawerTitle>
            </DrawerHeader>
            {qrContent}
            <DrawerDescription />
          </DrawerContent>
        </Drawer>
      </div>
      <div className="hidden w-full sm:w-auto md:block">
        <Dialog>
          <DialogTrigger asChild>{qrTrigger}</DialogTrigger>
          <DialogContent className="!max-h-[96vw] !max-w-[96vw] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Your <span className="font-bold text-primary">HACKER</span> QR
                Code
              </DialogTitle>
            </DialogHeader>
            {qrContent}
            <DialogDescription />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
