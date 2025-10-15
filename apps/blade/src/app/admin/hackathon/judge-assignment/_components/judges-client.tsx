"use client";

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";

import { api } from "~/trpc/react";

// --- NEW: local result type for the tRPC call
interface GenerateTokenResult {
  magicUrl: string;
}

export interface QRRoom {
  id: string;
  label: string;
  link: string; // magicUrl from judge.generateToken
}

export default function QRCodesClient() {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<QRRoom[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");

  const expandedRoom = useMemo(
    () => rooms.find((r) => r.id === expandedId) ?? null,
    [rooms, expandedId],
  );

  // Imperative fetch for a tRPC *query*
  const utils = api.useUtils();

  const handleGenerateRoom = async () => {
    if (!newRoomName.trim()) {
      alert("Please enter a room name");
      return;
    }

    // Check if room already exists
    const existingRoom = rooms.find(
      (room) => room.label.toLowerCase() === newRoomName.toLowerCase(),
    );
    if (existingRoom) {
      alert("A room with this name already exists");
      return;
    }

    setLoading(true);
    try {
      // Generate magic URL for the new room
      const { magicUrl } = (await utils.judge.generateToken.fetch({
        roomName: newRoomName.trim(),
      })) as GenerateTokenResult;

      const newRoom: QRRoom = {
        id: newRoomName.toLowerCase().replace(/\s+/g, "-"),
        label: newRoomName.trim(),
        link: magicUrl,
      };

      setRooms((prev) => [...prev, newRoom]);
      setNewRoomName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to generate room:", err);
      alert(`Failed to generate room: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (confirm("Are you sure you want to delete this room's QR code?")) {
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      if (expandedId === roomId) {
        setExpandedId(null);
      }
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

      {/* Room input form */}
      <div className="mx-auto max-w-md pb-12">
        <div className="flex gap-2">
          <Input
            placeholder="Enter room name..."
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleGenerateRoom();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleGenerateRoom}
            disabled={loading || !newRoomName.trim()}
            className="rounded-xl"
            variant="primary"
          >
            {loading ? "Generating..." : "Add Room"}
          </Button>
        </div>
      </div>

      {/* Grid of room QR tiles */}
      {rooms.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms ({rooms.length})</h2>
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
                    Magic QR
                  </span>
                </header>

                {/* Real QR preview */}
                <div className="mb-4 flex items-center justify-center bg-white p-2">
                  <QRCode value={room.link} size={160} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl"
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
                    Copy
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {rooms.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No rooms created yet. Add a room above to get started.
          </p>
        </div>
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

        {/* Large QR */}
        <div className="flex items-center justify-center bg-white py-6">
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
