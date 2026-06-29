"use client";

import { useEffect, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, CameraOff, Search, UserCheck } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import type { CheckInEventGroups } from "./types";

export interface CheckInMemberChoice {
  discordUsername: string;
  email: string;
  id: string;
  name: string;
  userId: string;
}

export interface CheckInResult {
  message: string;
  state: "already_checked_in" | "error" | "success";
}

function EventOptions({ groups }: { groups: CheckInEventGroups }) {
  return (
    <>
      {groups.current.length > 0 && (
        <optgroup label="Current events">
          {groups.current.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </optgroup>
      )}
      {groups.recent.length > 0 && (
        <optgroup label="Recently ended">
          {groups.recent.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </optgroup>
      )}
      {groups.older.length > 0 && (
        <optgroup label="Older events">
          {groups.older.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}

export function EventCheckInPanel({
  checkIn,
  groups,
  searchOlderEvents,
  searchMembers,
}: {
  checkIn?: (input: {
    eventId: string;
    memberId?: string;
    qrPayload?: string;
  }) => Promise<CheckInResult>;
  groups: CheckInEventGroups;
  searchOlderEvents?: (query: string) => Promise<CheckInEventGroups>;
  searchMembers?: (query: string) => Promise<CheckInMemberChoice[]>;
}) {
  const [eventId, setEventId] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [olderQuery, setOlderQuery] = useState("");
  const [olderEvents, setOlderEvents] = useState(groups.older);
  const [members, setMembers] = useState<CheckInMemberChoice[]>([]);
  const [selectedMember, setSelectedMember] =
    useState<CheckInMemberChoice | null>(null);
  const [feedback, setFeedback] = useState<CheckInResult | null>(null);
  const [pending, setPending] = useState(false);
  const scanning = useRef(false);

  useEffect(() => {
    if (!manualOpen || query.trim().length < 2 || !searchMembers) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void searchMembers(query.trim()).then((result) => {
        if (!cancelled) setMembers(result);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [manualOpen, query, searchMembers]);

  useEffect(() => {
    if (olderQuery.trim().length < 2 || !searchOlderEvents) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void searchOlderEvents(olderQuery.trim()).then((result) => {
        if (!cancelled) setOlderEvents(result.older);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [olderQuery, searchOlderEvents]);

  const displayedOlderEvents =
    olderQuery.trim().length < 2 ? groups.older : olderEvents;

  async function submit(input: { memberId?: string; qrPayload?: string }) {
    if (!eventId) {
      setFeedback({
        message: "Select an event before checking in.",
        state: "error",
      });
      return;
    }
    if (!checkIn) return;

    setPending(true);
    try {
      setFeedback(await checkIn({ eventId, ...input }));
    } catch (cause) {
      setFeedback({
        message:
          cause instanceof Error
            ? cause.message
            : "Check-in could not be completed.",
        state: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-2xl shadow-black/25 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Event check-in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an event, then scan each member or use manual lookup.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="check-in-event">Select event</Label>
          <select
            id="check-in-event"
            aria-label="Event"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setFeedback(null);
            }}
          >
            <option value="">Select event</option>
            <EventOptions groups={{ ...groups, older: displayedOlderEvents }} />
          </select>
        </div>

        <div className="mt-3 grid gap-2">
          <Label htmlFor="older-event-search">Find an older event</Label>
          <Input
            id="older-event-search"
            type="search"
            value={olderQuery}
            placeholder="Search older event titles"
            onChange={(event) => setOlderQuery(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Older results include titles only and never load attendee data.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="min-h-11 gap-2"
            disabled={!eventId}
            onClick={() => {
              setCameraOpen((current) => !current);
              setManualOpen(false);
            }}
          >
            {cameraOpen ? (
              <CameraOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Camera className="h-4 w-4" aria-hidden="true" />
            )}
            {cameraOpen ? "Close scanner" : "Open scanner"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            disabled={!eventId}
            onClick={() => {
              setManualOpen((current) => !current);
              setCameraOpen(false);
            }}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Manual lookup
          </Button>
        </div>

        {cameraOpen && (
          <div className="mt-4 overflow-hidden rounded-md border border-white/10 bg-background/60 p-2">
            <Scanner
              scanDelay={1200}
              constraints={{ facingMode: "environment" }}
              formats={["qr_code"]}
              onError={() =>
                setCameraError(
                  "Camera access is unavailable. Use manual lookup instead.",
                )
              }
              onScan={(codes) => {
                const payload = codes[0]?.rawValue;
                if (!payload || scanning.current) return;
                scanning.current = true;
                void submit({ qrPayload: payload }).finally(() => {
                  window.setTimeout(() => {
                    scanning.current = false;
                  }, 1000);
                });
              }}
            />
            {cameraError && (
              <p className="p-3 text-sm text-destructive">{cameraError}</p>
            )}
          </div>
        )}

        {manualOpen && (
          <div className="mt-4 grid gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:p-4">
            <div className="grid gap-2">
              <Label htmlFor="member-search">Find member</Label>
              <Input
                id="member-search"
                type="search"
                value={query}
                placeholder="Name, Discord username, or email"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedMember(null);
                }}
              />
            </div>
            {members.length > 0 && (
              <div className="grid gap-2" aria-label="Member results">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="min-h-11 rounded-md border border-white/10 bg-card/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setSelectedMember(member)}
                  >
                    <span className="block text-sm font-medium">
                      {member.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      @{member.discordUsername} · {member.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedMember && (
              <Button
                type="button"
                className="min-h-11 gap-2"
                disabled={pending}
                onClick={() => submit({ memberId: selectedMember.id })}
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                Check in {selectedMember.name}
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/20 sm:p-6">
        <h2 className="text-base font-semibold">Latest result</h2>
        {feedback ? (
          <div
            role="status"
            className={`mt-4 rounded-md border p-4 text-sm font-medium ${
              feedback.state === "success"
                ? "border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]"
                : feedback.state === "already_checked_in"
                  ? "border-[hsl(var(--chart-3)/0.35)] bg-[hsl(var(--chart-3)/0.12)] text-[hsl(var(--chart-3))]"
                  : "border-destructive/35 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.message}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Results stay visible while the scanner remains ready for the next
            member.
          </p>
        )}
      </aside>
    </section>
  );
}
