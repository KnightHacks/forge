"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@forge/ui/button";
import { api } from "~/trpc/react";

// --- NEW: local result type for the tRPC call
interface GenerateTokenResult { magicUrl: string }

// Proper dynamic import; cast so TS is happy
const QRCode = dynamic(() => import("react-qr-code").then(m => m.default), {
  ssr: false,
}) as unknown as React.ComponentType<{ value: string; size?: number; className?: string }>;

export interface QRRoom {
  id: string;
  label: string;
  link: string; // magicUrl from judge.generateToken
}

export default function QRCodesClient() {
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<QRRoom[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedRoom = useMemo(
    () => rooms.find((r) => r.id === expandedId) ?? null,
    [rooms, expandedId],
  );

  // Imperative fetch for a tRPC *query*
  const utils = api.useUtils();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // For now: generate 6 test rooms
      const labels = Array.from({ length: 6 }, (_, i) => `Room ${i + 1}`);

      const minted: QRRoom[] = await Promise.all(
        labels.map(async (label) => {
          // --- NOTE: explicitly type the fetch result to avoid 'any'
          const { magicUrl } =
            (await utils.judge.generateToken.fetch({ roomName: label })) as GenerateTokenResult;

          return {
            id: label.toLowerCase().replace(/\s+/g, "-"),
            label,
            link: magicUrl,
          };
        }),
      );

      setRooms(minted);
      setGenerated(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to generate links:", err);
      alert(`Failed to generate links: ${message}`);
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            className="h-14 rounded-2xl px-8 text-base"
            variant="primary"
          >
            {loading ? "Generating…" : "Generate Magic Links & QR Codes"}
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
                  <h3 className="truncate text-base font-semibold">{room.label}</h3>
                  <span className="text-xs text-muted-foreground">Magic QR</span>
                </header>

                {/* Real QR preview */}
                <div className="mb-4 flex items-center justify-center">
                  <QRCode value={room.link} size={160} />
                </div>

                <div className="flex items-center justify-between">
                  <Button size="sm" className="rounded-xl" onClick={() => setExpandedId(room.id)}>
                    Expand
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void navigator.clipboard.writeText(room.link)}
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
          <p className="mt-1 truncate text-xs text-muted-foreground">{room.link}</p>
        </div>

        {/* Large QR */}
        <div className="flex items-center justify-center py-6">
          <QRCode value={room.link} size={380} />
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
            onClick={() => window.open(room.link, "_blank", "noopener,noreferrer")}
          >
            Open Link
          </Button>
        </div>
      </div>
    </div>
  );
}
