"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  CalendarDays,
  Camera,
  CameraOff,
  History,
  QrCode,
  UserCheck,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@forge/ui/avatar";
import { Button } from "@forge/ui/button";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Switch } from "@forge/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import type { CheckInEventGroups } from "./types";
import { formatEventDateTime } from "./event-presenters";

export interface CheckInMemberChoice {
  discordUsername: string;
  email: string;
  id: string;
  name: string;
  userId: string;
}

export interface CheckInResult {
  member?: {
    company: string | null;
    discordUsername: string;
    id: string;
    name: string;
    tagline: string | null;
  };
  message: string;
  state: "already_checked_in" | "error" | "success";
}

export type CheckInRequest =
  | { eventId: string; memberId: string }
  | { allowRepeat?: boolean; eventId: string; qrPayload: string };

type EventTiming = "past" | "upcoming";

export const CHECK_IN_SCANNER_OPTIONS = {
  allowMultiple: true,
  scanDelay: 3000,
} as const;

export function rearmQrPayloadsOutsideFrame(
  handledPayloads: Set<string>,
  detectedCodes: readonly { rawValue: string }[],
) {
  const visiblePayloads = new Set(
    detectedCodes.map(({ rawValue }) => rawValue).filter(Boolean),
  );
  for (const payload of handledPayloads) {
    if (!visiblePayloads.has(payload)) handledPayloads.delete(payload);
  }
}

export function checkInEventLabel(event: { startAt: string; title: string }) {
  return `${event.title} · ${formatEventDateTime(event.startAt)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function CheckInFeedback({ result }: { result: CheckInResult }) {
  return (
    <div
      role="status"
      className={`mt-4 rounded-md border p-4 text-sm ${
        result.state === "success"
          ? "border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.12)]"
          : result.state === "already_checked_in"
            ? "border-[hsl(var(--chart-3)/0.35)] bg-[hsl(var(--chart-3)/0.12)]"
            : "border-destructive/35 bg-destructive/10"
      }`}
    >
      <p
        className={`font-medium ${
          result.state === "success"
            ? "text-[hsl(var(--chart-2))]"
            : result.state === "already_checked_in"
              ? "text-[hsl(var(--chart-3))]"
              : "text-destructive"
        }`}
      >
        {result.message}
      </p>
      {result.member && (
        <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-white/10 pt-3 text-foreground">
          <Avatar className="h-11 w-11 border border-white/10">
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">
              {initials(result.member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{result.member.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              @{result.member.discordUsername}
            </p>
            {(result.member.tagline || result.member.company) && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {result.member.tagline || result.member.company}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EventCheckInPanel({
  checkIn,
  groups,
  searchMembers,
}: {
  checkIn?: (input: CheckInRequest) => Promise<CheckInResult>;
  groups: CheckInEventGroups;
  searchMembers?: (query: string) => Promise<CheckInMemberChoice[]>;
}) {
  const [timing, setTiming] = useState<EventTiming>("upcoming");
  const [eventId, setEventId] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<CheckInMemberChoice[]>([]);
  const [memberSearchPending, setMemberSearchPending] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState<string | null>(
    null,
  );
  const [selectedMember, setSelectedMember] =
    useState<CheckInMemberChoice | null>(null);
  const [feedback, setFeedback] = useState<CheckInResult | null>(null);
  const [pending, setPending] = useState(false);
  const scanning = useRef(false);
  const handledQrPayloads = useRef(new Set<string>());

  const eventChoices = useMemo(
    () =>
      timing === "upcoming"
        ? groups.current
        : [...groups.recent, ...groups.older],
    [groups, timing],
  );
  const memberChoices = useMemo(
    () =>
      selectedMember &&
      !members.some((member) => member.id === selectedMember.id)
        ? [selectedMember, ...members]
        : members,
    [members, selectedMember],
  );

  useEffect(() => {
    const normalizedQuery = memberQuery.trim();
    if (normalizedQuery.length < 2 || !searchMembers) {
      setMembers([]);
      setMemberSearchError(null);
      setMemberSearchPending(false);
      return;
    }

    let cancelled = false;
    setMembers([]);
    setMemberSearchPending(true);
    setMemberSearchError(null);
    const timeout = window.setTimeout(() => {
      void searchMembers(normalizedQuery)
        .then((result) => {
          if (!cancelled) setMembers(result);
        })
        .catch(() => {
          if (!cancelled) {
            setMembers([]);
            setMemberSearchError("Member search could not be loaded.");
          }
        })
        .finally(() => {
          if (!cancelled) setMemberSearchPending(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [memberQuery, searchMembers]);

  async function submit(
    input: { memberId?: string; qrPayload?: string },
    repeat = false,
  ) {
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
      setFeedback(
        await checkIn(
          input.memberId
            ? { eventId, memberId: input.memberId }
            : {
                allowRepeat: repeat,
                eventId,
                qrPayload: input.qrPayload ?? "",
              },
        ),
      );
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

  function selectTiming(nextTiming: EventTiming) {
    if (nextTiming === timing) return;
    setTiming(nextTiming);
    setEventId("");
    setCameraOpen(false);
    setCameraError(null);
    setFeedback(null);
  }

  return (
    <section
      className={`grid min-w-0 gap-0 sm:gap-4 ${
        feedback ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""
      }`}
    >
      <div className="border-y border-white/10 bg-card/95 p-3 shadow-2xl shadow-black/25 sm:rounded-lg sm:border sm:p-6">
        <h2 className="sr-only">Check in members</h2>

        <div className="grid gap-3 border-b border-border/60 pb-4">
          <div
            role="group"
            aria-label="Check-in event timing"
            className="grid grid-cols-2 rounded-lg border border-white/10 bg-background/60 p-1"
          >
            <Button
              type="button"
              variant={timing === "upcoming" ? "primary" : "ghost"}
              aria-pressed={timing === "upcoming"}
              className="min-h-11 gap-2"
              onClick={() => selectTiming("upcoming")}
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Upcoming
            </Button>
            <Button
              type="button"
              variant={timing === "past" ? "primary" : "ghost"}
              aria-pressed={timing === "past"}
              className="min-h-11 gap-2"
              onClick={() => selectTiming("past")}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              Past
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="check-in-event">Event</Label>
            <ResponsiveComboBox
              ariaLabel="Event"
              triggerId="check-in-event"
              items={eventChoices}
              value={eventId || null}
              buttonPlaceholder={
                eventChoices.length > 0
                  ? "Search events"
                  : `No ${timing} events available`
              }
              inputPlaceholder={`Search ${timing} events`}
              triggerClassName="min-h-11 bg-background/70"
              getItemLabel={checkInEventLabel}
              getItemValue={(event) => event.id}
              renderItem={(event) => (
                <span className="min-w-0">
                  <span className="block truncate">{event.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {formatEventDateTime(event.startAt)}
                  </span>
                </span>
              )}
              onValueChange={(value) => {
                setEventId(value);
                setFeedback(null);
              }}
            />
          </div>
        </div>

        <Tabs
          defaultValue="scanner"
          className="mt-4 w-full"
          onValueChange={(value) => {
            if (value === "manual") setCameraOpen(false);
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="scanner" className="min-h-11 gap-2">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="manual" className="min-h-11 gap-2">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="mt-4 grid gap-4">
            <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/10 bg-background/60 px-3 py-2">
              <Label htmlFor="allow-repeat-check-ins">
                Allow repeat check-ins
              </Label>
              <Switch
                id="allow-repeat-check-ins"
                checked={allowRepeat}
                onCheckedChange={setAllowRepeat}
              />
            </div>

            <Button
              type="button"
              className="min-h-11 gap-2"
              disabled={!eventId}
              onClick={() => {
                setCameraOpen((current) => {
                  if (!current) handledQrPayloads.current.clear();
                  return !current;
                });
                setCameraError(null);
              }}
            >
              {cameraOpen ? (
                <CameraOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
              {cameraOpen ? "Close scanner" : "Open scanner"}
            </Button>

            {cameraOpen && (
              <div className="overflow-hidden rounded-md border border-white/10 bg-background/60 p-2">
                <Scanner
                  allowMultiple={CHECK_IN_SCANNER_OPTIONS.allowMultiple}
                  scanDelay={CHECK_IN_SCANNER_OPTIONS.scanDelay}
                  constraints={{ facingMode: "environment" }}
                  formats={["qr_code"]}
                  components={{
                    tracker: (codes) =>
                      rearmQrPayloadsOutsideFrame(
                        handledQrPayloads.current,
                        codes,
                      ),
                  }}
                  onError={() =>
                    setCameraError(
                      "Camera access is unavailable. Use Manual entry instead.",
                    )
                  }
                  onScan={(codes) => {
                    const payload = codes[0]?.rawValue;
                    if (
                      !payload ||
                      scanning.current ||
                      handledQrPayloads.current.has(payload)
                    )
                      return;
                    handledQrPayloads.current.add(payload);
                    scanning.current = true;
                    void submit({ qrPayload: payload }, allowRepeat).finally(
                      () => {
                        window.setTimeout(() => {
                          scanning.current = false;
                        }, 1000);
                      },
                    );
                  }}
                />
                {cameraError && (
                  <p className="p-3 text-sm text-destructive">{cameraError}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="member-search">Member</Label>
              <ResponsiveComboBox
                ariaLabel="Member"
                triggerId="member-search"
                items={memberChoices}
                value={selectedMember?.id ?? null}
                buttonPlaceholder="Search for a member"
                inputPlaceholder="Name, Discord username, or email"
                emptyMessage={
                  memberQuery.trim().length < 2
                    ? "Enter at least 2 characters."
                    : (memberSearchError ?? "No members found.")
                }
                filterItems={false}
                isLoading={memberSearchPending}
                triggerClassName="min-h-11 bg-background/70"
                getItemLabel={(member) => member.name}
                getItemSearchValue={(member) =>
                  `${member.name} ${member.discordUsername} ${member.email}`
                }
                getItemValue={(member) => member.id}
                renderItem={(member) => (
                  <div className="min-w-0">
                    <span className="block truncate font-medium">
                      {member.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      @{member.discordUsername} · {member.email}
                    </span>
                  </div>
                )}
                onSearchValueChange={(value) => {
                  setMemberQuery(value);
                  setSelectedMember(null);
                }}
                onItemSelect={setSelectedMember}
              />
            </div>

            <Button
              type="button"
              className="min-h-11 gap-2"
              disabled={!eventId || !selectedMember || pending}
              onClick={() => {
                if (selectedMember) {
                  void submit({ memberId: selectedMember.id });
                }
              }}
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              {selectedMember
                ? `Check in ${selectedMember.name}`
                : "Select a member to check in"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {feedback ? (
        <aside className="border-b border-white/10 bg-card/95 p-3 shadow-xl shadow-black/20 sm:rounded-lg sm:border sm:p-6">
          <h2 className="text-base font-semibold">Latest result</h2>
          <CheckInFeedback result={feedback} />
        </aside>
      ) : null}
    </section>
  );
}
