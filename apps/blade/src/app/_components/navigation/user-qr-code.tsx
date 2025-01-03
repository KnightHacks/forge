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

export function QRCodePopup() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          <span>Show QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-h-[96vw] !max-w-[96vw]">
        <DialogHeader>
          <DialogTitle>Your QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-6">
          <div className="rounded-lg bg-white p-4">
            {/* This is where you'd implement your actual QR code */}
            {/* For demonstration, showing a placeholder */}
            <div className="flex h-[40vw] w-[40vw] items-center justify-center bg-gray-200">
              <span className="text-sm text-gray-500">QR Code Here</span>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogDescription></DialogDescription>
    </Dialog>
  );
}
