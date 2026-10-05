"use client";

import { useState } from "react";
import { Loader2, MapPinned, Plus, Save, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { VENUE_MAP } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";
import { saveMapConfigurationSchema } from "@forge/validators";

import { api } from "~/trpc/react";

type Detail = RouterOutputs["hackathon"]["get"];
type RoomDraft = VENUE_MAP.PermittedRoom & { key: string };

export function MapConfigurationSection({
  detail,
  isRefreshing,
  onSaved,
}: {
  detail: Pick<Detail, "mapConfiguration"> & {
    hackathon: Pick<Detail["hackathon"], "id">;
  };
  isRefreshing: boolean;
  onSaved: () => void;
}) {
  const [rooms, setRooms] = useState<RoomDraft[]>(() =>
    detail.mapConfiguration.rooms.map((room, index) => ({
      ...room,
      key: String(index),
    })),
  );
  const [enabled, setEnabled] = useState(
    detail.mapConfiguration.restrictionsEnabled,
  );
  const [error, setError] = useState<string | null>(null);
  const save = api.hackathon.saveMapConfiguration.useMutation({
    onError: (cause) => {
      setError(cause.message);
      toast.error(cause.message);
    },
    onSuccess: () => {
      setError(null);
      toast.success("Map room access saved.");
      onSaved();
    },
  });
  const busy = save.isPending || isRefreshing;
  const values = {
    hackathonId: detail.hackathon.id,
    restrictionsEnabled: enabled,
    rooms: rooms.map(({ buildingId, roomNumber, name }) => ({
      buildingId,
      roomNumber,
      name,
    })),
  };
  const parsed = saveMapConfigurationSchema.safeParse(values);
  const unchanged =
    parsed.success &&
    parsed.data.restrictionsEnabled ===
      detail.mapConfiguration.restrictionsEnabled &&
    JSON.stringify(parsed.data.rooms) ===
      JSON.stringify(detail.mapConfiguration.rooms);

  function updateRoom(key: string, change: Partial<VENUE_MAP.PermittedRoom>) {
    setRooms((current) =>
      current.map((room) => (room.key === key ? { ...room, ...change } : room)),
    );
    setError(null);
  }

  return (
    <Card role="region" aria-labelledby="map-room-access-title">
      <CardHeader>
        <CardTitle
          id="map-room-access-title"
          className="flex items-center gap-2"
        >
          <MapPinned className="size-5" aria-hidden="true" />
          Map room access
        </CardTitle>
        <CardDescription>
          Prepare permitted rooms for this hackathon, then enable restrictions
          when the list is ready. Known bathrooms remain available.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <div className="flex min-h-11 items-start justify-between gap-4 rounded-md border border-white/10 bg-background/60 p-4">
          <div className="min-w-0">
            <Label htmlFor="map-restrictions">Enable room restrictions</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlisted rooms appear red without numbers on the map. Saving a
              list alone does not enable restrictions.
            </p>
          </div>
          <Switch
            id="map-restrictions"
            checked={enabled}
            disabled={busy}
            onCheckedChange={setEnabled}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {rooms.length} permitted {rooms.length === 1 ? "room" : "rooms"}
          </p>
          <Button
            type="button"
            className="min-h-11 gap-2"
            variant="secondary"
            disabled={busy || rooms.length >= 1000}
            onClick={() =>
              setRooms((current) => [
                ...current,
                {
                  key: crypto.randomUUID(),
                  buildingId: "eng1",
                  roomNumber: "",
                  name: null,
                },
              ])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Add room
          </Button>
        </div>
        {rooms.length ? (
          <div
            aria-label="Permitted rooms"
            className="max-h-96 overflow-y-auto rounded-md border border-white/10 bg-background/60"
            tabIndex={0}
          >
            {rooms.map((room, index) => (
              <div
                key={room.key}
                className="grid gap-3 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[7rem_6rem_minmax(0,1fr)_2.75rem] sm:items-end"
              >
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor={`map-building-${room.key}`}>Building</Label>
                  <Select
                    disabled={busy}
                    value={room.buildingId}
                    onValueChange={(value) => {
                      const building = VENUE_MAP.BUILDINGS.find(
                        (candidate) => candidate.id === value,
                      );
                      if (building)
                        updateRoom(room.key, { buildingId: building.id });
                    }}
                  >
                    <SelectTrigger
                      id={`map-building-${room.key}`}
                      aria-label={`Building ${index + 1}`}
                      className="h-11 w-full bg-background/70"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_MAP.BUILDINGS.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor={`map-room-${room.key}`}>Room</Label>
                  <Input
                    id={`map-room-${room.key}`}
                    aria-label={`Room ${index + 1}`}
                    className="h-11 bg-background/70"
                    disabled={busy}
                    maxLength={24}
                    value={room.roomNumber}
                    onChange={(event) =>
                      updateRoom(room.key, { roomNumber: event.target.value })
                    }
                  />
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor={`map-name-${room.key}`}>
                    Name (optional)
                  </Label>
                  <Input
                    id={`map-name-${room.key}`}
                    aria-label={`Name ${index + 1}`}
                    className="h-11 bg-background/70"
                    disabled={busy}
                    maxLength={120}
                    value={room.name ?? ""}
                    onChange={(event) =>
                      updateRoom(room.key, { name: event.target.value })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="size-11 justify-self-end"
                  aria-label={`Remove room ${index + 1}`}
                  disabled={busy}
                  onClick={() =>
                    setRooms((current) =>
                      current.filter((candidate) => candidate.key !== room.key),
                    )
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No rooms listed. With restrictions enabled, ordinary rooms will all
            appear restricted.
          </p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="min-h-11 w-fit gap-2"
          disabled={busy || unchanged}
          onClick={() => {
            if (!parsed.success) {
              setError(
                parsed.error.issues[0]?.message ?? "Check the room list.",
              );
              return;
            }
            save.mutate(parsed.data);
          }}
        >
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Save map room access
        </Button>
      </CardContent>
    </Card>
  );
}
