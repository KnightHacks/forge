"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import styles from "./hacker-qr-code.module.css";
import dashboardStyles from "./khix-dashboard.module.css";

export function HackerQRCode({
  qrCode,
  qrClassName,
}: {
  qrCode: string;
  qrClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={styles.trigger}
          aria-label="Enlarge your check-in QR code"
        >
          <span className={`${qrClassName ?? ""} ${styles.code}`}>
            <span className={styles.glow} aria-hidden="true" />
            <Image
              src={qrCode}
              width={320}
              height={320}
              alt="Your Knight Hacks IX check-in QR code"
              unoptimized
            />
          </span>
          <span className={styles.hint} aria-hidden="true">
            <Expand size={14} />
            Tap to enlarge
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className={`${dashboardStyles.theme} ${styles.dialog}`}
        showCloseButton={false}
      >
        <div className={styles.header}>
          <DialogTitle className={styles.title}>Your QR code</DialogTitle>
          <DialogClose className={styles.close} aria-label="Close QR code">
            <X size={20} aria-hidden="true" />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Show this code to a volunteer to scan.
        </DialogDescription>
        <Image
          className={styles.expandedCode}
          src={qrCode}
          width={640}
          height={640}
          alt="Your enlarged Knight Hacks IX check-in QR code"
          unoptimized
        />
      </DialogContent>
    </Dialog>
  );
}
