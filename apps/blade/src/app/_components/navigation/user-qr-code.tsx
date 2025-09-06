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

export function QRCodePopup() {
  const { data: userQR, isLoading, isError } = api.qr.getQRCode.useQuery();

  const qrTrigger = (
    <Button size="sm" className="w-full gap-2">
      <QrCode className="h-4 w-4" />
      <span className="font-bold">View QR Code</span>
    </Button>
  );

  const qrContent = (
    <div className="flex items-center justify-center p-6">
      {isError && (
        <div className="text-black">Something went wrong. please try again</div>
      )}
      {isLoading && (
        <Loader2 color="#000000" size={50} className="animate-spin" />
      )}
      {userQR?.qrCodeUrl && (
        <div className="rounded-lg bg-white p-4">
          <Image
            unoptimized
            src={userQR.qrCodeUrl}
            alt="QR Code"
            width={400}
            height={400}
          />
        </div>
      )}
      {!isLoading && !userQR?.qrCodeUrl && !isError && (
        <div className="text-black">No QR Code found.</div>
      )}
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger asChild>{qrTrigger}</DrawerTrigger>
          <DrawerContent className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Your QR Code</DrawerTitle>
            </DrawerHeader>
            {qrContent}
            <DrawerDescription />
          </DrawerContent>
        </Drawer>
      </div>
      <div className="hidden md:block">
        <Dialog>
          <DialogTrigger asChild>{qrTrigger}</DialogTrigger>
          <DialogContent className="!max-h-[96vw] !max-w-[96vw] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Your QR Code</DialogTitle>
            </DialogHeader>
            {qrContent}
            <DialogDescription />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
