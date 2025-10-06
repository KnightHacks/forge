"use client";

import { useMemo, useState } from "react";

import { Button } from "@forge/ui/button";

export interface QRRoom {
  id: string;
  label: string;
  link: string;
}

export default function QRCodesClient() {
  // show grid
  const [generated, setGenerated] = useState<boolean>(false);
  // room data
  const [rooms, setRooms] = useState<QRRoom[]>([]);
  // which room is expanded (null = none)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedRoom = useMemo(
    () => rooms.find((r) => r.id === expandedId) ?? null,
    [rooms, expandedId],
  );

  const handleGenerate = () => {
    // For testing: create 6 room templates & pretend magic links were minted.
    // Replace `link` with your real room URL once backend is ready.
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const six: QRRoom[] = Array.from({ length: 6 }).map((_, i) => {
      const n = i + 1;
      return {
        id: `room-${n}`,
        label: `Room ${n}`,
        link: `${base}/judge`, // static QR per room
      };
    });
    setRooms(six);
    setGenerated(true);
  };

  return (
    <main className="container min-h-screen py-12">
      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-4 pb-8">
        <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
          Judges QR Codes
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          QR codes for each judging room.
        </p>
      </div>

      {/* Big primary action */}
      {!generated && (
        <div className="flex justify-center pb-12">
          <Button
            onClick={handleGenerate}
            className="h-14 rounded-2xl px-8 text-base"
            variant="primary"
          >
            Generate Magic Links & QR Codes
          </Button>
        </div>
      )}

      {/* Grid of room QR tiles */}
      {generated && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="rounded-2xl border p-4 shadow-sm transition hover:shadow-md"
              >
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="truncate text-base font-semibold">
                    {room.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Static QR
                  </span>
                </header>

                {/* QR preview placeholder — swap with real QR component later */}
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-lg border text-center text-xs text-muted-foreground">
                    QR for
                    <br />
                    <span className="font-mono">
                      {room.link.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setExpandedId(room.id)}
                  >
                    Expand
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      void navigator.clipboard.writeText(room.link)
                    }
                  >
                    Copy Link
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Full-screen overlay for expanded QR */}
      {expandedRoom && (
        <FullscreenQR room={expandedRoom} onClose={() => setExpandedId(null)} />
      )}
    </main>
  );
}

/* ---------- Fullscreen overlay component ---------- */

function FullscreenQR(props: { room: QRRoom; onClose: () => void }) {
  const { room, onClose } = props;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <Button
          aria-label="Close"
          variant="outline"
          size="sm"
          className="absolute right-4 top-4 rounded-xl"
          onClick={onClose}
        >
          Close
        </Button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h3 id="qr-dialog-title" className="text-xl font-semibold">
            {room.label}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {room.link}
          </p>
        </div>

        {/* QR Preview (placeholder) */}
        <div className="flex items-center justify-center py-6">
          <div className="flex h-[420px] w-[420px] items-center justify-center rounded-2xl border text-center text-sm text-muted-foreground">
            QR for
            <br />
            <span className="font-mono">
              {room.link.replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void navigator.clipboard.writeText(room.link)}
          >
            Copy Link
          </Button>
          <Button
            className="rounded-xl"
            onClick={() =>
              window.open(room.link, "_blank", "noopener,noreferrer")
            }
          >
            Open Link
          </Button>
        </div>
      </div>
    </div>
  );
}
