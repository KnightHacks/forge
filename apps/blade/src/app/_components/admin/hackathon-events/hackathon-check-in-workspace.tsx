"use client";

import type { SetStateAction } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  History,
  Loader2,
  QrCode,
  ScanLine,
  UserCheck,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Skeleton } from "@forge/ui/skeleton";
import { Switch } from "@forge/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import type {
  HackathonCheckInOutcome,
  HackathonCheckInResult,
} from "./check-in-result-dialog";
import {
  CHECK_IN_QR_SCANNER_OPTIONS,
  claimCheckInQrPayload,
  observeCheckInQrPayloads,
  rearmAbsentCheckInQrPayloads,
  releaseCheckInQrPayload,
} from "~/app/_components/admin/check-in-qr-scanner";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";
import { CheckInResultDialog } from "./check-in-result-dialog";

const OUTCOMES = new Set<HackathonCheckInOutcome>([
  "already_checked_in",
  "checked_in",
  "hacker_not_found",
  "invalid_qr",
  "not_checked_in",
  "not_ready",
  "unknown",
  "wrong_class",
  "wrong_status",
]);

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function date(value: unknown) {
  return value instanceof Date || typeof value === "string" ? value : null;
}

function boolean(value: unknown) {
  return value === true;
}

function adaptRoleDelivery(
  value: unknown,
): NonNullable<HackathonCheckInResult["roleDelivery"]> {
  const row = object(value);
  const delivery = object(
    row.roleDelivery ?? row.roleHealth ?? row.delivery ?? value,
  );
  const rawGrants = Array.isArray(delivery.grants) ? delivery.grants : [];
  const grants = rawGrants.flatMap((rawGrant) => {
    const grant = object(rawGrant);
    const kind = text(grant.kind);
    const state = text(grant.state);
    if (
      (kind !== "class" && kind !== "general" && kind !== "vip") ||
      (state !== "failed" &&
        state !== "pending" &&
        state !== "succeeded" &&
        state !== "unknown")
    )
      return [];
    return [
      {
        kind,
        state,
      } satisfies NonNullable<
        HackathonCheckInResult["roleDelivery"]
      >["grants"][number],
    ];
  });
  const failedCount = delivery.failedCount;

  return {
    grants,
    needsAttention:
      delivery.needsAttention === true ||
      delivery.state === "error" ||
      (typeof failedCount === "number" && failedCount > 0) ||
      grants.some(({ state }) => state === "failed" || state === "unknown"),
  };
}

function adaptResult(
  value: unknown,
  fallbackEvent?: { name: string; purpose: string },
): HackathonCheckInResult {
  const row = object(value);
  const nestedResult = object(row.result);
  const payload = Object.keys(nestedResult).length > 0 ? nestedResult : row;
  const hacker = object(payload.hacker);
  const event = object(payload.event);
  const classValue = object(
    payload.class ??
      hacker.class ?? {
        color: payload.classColor,
        name: payload.className,
      },
  );
  const className = text(classValue.name);
  const classColor = text(classValue.color);
  const deliveryValue =
    row.roleDelivery ??
    row.roleHealth ??
    payload.roleDelivery ??
    payload.roleHealth;
  const rawOutcome = text(payload.outcome ?? payload.status) ?? "unknown";
  const outcome = OUTCOMES.has(rawOutcome as HackathonCheckInOutcome)
    ? (rawOutcome as HackathonCheckInOutcome)
    : "unknown";
  const firstTime = text(payload.firstTimeStatus ?? hacker.firstTimeStatus);

  return {
    attemptId: text(row.attemptId ?? row.id) ?? "unknown",
    checkedInAt:
      date(
        payload.checkedInAt ??
          payload.attemptedAt ??
          row.checkedInAt ??
          row.createdAt,
      ) ?? "",
    class:
      className && classColor ? { color: classColor, name: className } : null,
    dateOfBirth: text(
      payload.dateOfBirth ?? payload.dob ?? hacker.dateOfBirth ?? hacker.dob,
    ),
    eventName:
      text(payload.eventName ?? event.name) ??
      fallbackEvent?.name ??
      "Selected event",
    eventPurpose:
      text(payload.eventPurpose ?? event.purpose ?? fallbackEvent?.purpose) ===
      "primary_check_in"
        ? "primary_check_in"
        : "event",
    firstTimeStatus:
      firstTime === "first" || firstTime === "returning"
        ? firstTime
        : "unknown",
    hackerName: text(payload.hackerName ?? payload.name ?? hacker.name),
    isVip: boolean(payload.isVip ?? hacker.isVip),
    operatorName:
      text(payload.operatorName ?? object(payload.operator).name) ??
      "Not recorded",
    outcome,
    pointsAwarded:
      typeof payload.pointsAwarded === "number" ? payload.pointsAwarded : 0,
    roleDelivery:
      deliveryValue === null || deliveryValue === undefined
        ? null
        : adaptRoleDelivery(deliveryValue),
    statusAtAttempt: text(
      payload.statusAtAttempt ?? payload.currentStatus ?? hacker.status,
    ),
    wasMinorAtAttempt: boolean(
      payload.wasMinorAtAttempt ?? payload.wasMinor ?? payload.isMinor,
    ),
  };
}

function useScopedState<Value>(scope: string, initial: Value) {
  const [state, setState] = useState({ scope, value: initial });
  const value = state.scope === scope ? state.value : initial;
  const update = useCallback(
    (next: SetStateAction<Value>) => {
      setState((current) => {
        const currentValue = current.scope === scope ? current.value : initial;
        return {
          scope,
          value:
            typeof next === "function"
              ? (next as (current: Value) => Value)(currentValue)
              : next,
        };
      });
    },
    [initial, scope],
  );
  return [value, update] as const;
}

export function flattenCheckInHistoryPages<Row>(
  pages: readonly { rows: readonly Row[] }[] | undefined,
) {
  return pages?.flatMap(({ rows }) => rows) ?? [];
}

export function showHackathonRepeatControl(
  primary: boolean,
  mode: "manual" | "scanner",
) {
  return !primary && mode === "scanner";
}

function CheckInWorkspaceSkeleton() {
  return (
    <section
      aria-label="Loading hackathon check-in station"
      className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <Card className="min-w-0 border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-14" />
          <Skeleton className="h-12" />
          <Skeleton className="h-11" />
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
      <Card className="min-w-0 border-white/10 bg-card/95 shadow-xl shadow-black/20">
        <CardHeader className="grid gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-0 px-0 py-0">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              className="grid gap-2 border-t border-border/70 px-4 py-3 first:border-t-0"
              key={index}
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function CheckInHistorySkeleton() {
  return (
    <div aria-label="Loading recent check-in history">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid gap-2 border-t border-border/70 px-4 py-3 first:border-t-0"
          key={index}
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function HackathonCheckInWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const hackathons = api.hackathonEvent.listCheckInHackathons.useQuery();
  const requestedHackathonId = searchParams.get("hackathon");
  const selectedHackathon = useMemo(
    () =>
      hackathons.data?.find(({ id }) => id === requestedHackathonId) ??
      hackathons.data?.[0] ??
      null,
    [hackathons.data, requestedHackathonId],
  );
  const eventData = api.hackathonEvent.listCheckInEvents.useQuery(
    { hackathonId: selectedHackathon?.id ?? "" },
    { enabled: selectedHackathon !== null },
  );
  const requestedEventId = searchParams.get("event");
  const selectedEvent =
    eventData.data?.events.find(({ id }) => id === requestedEventId) ?? null;
  const [selection, setSelection] = useOptimistic({
    hackathonId: selectedHackathon?.id ?? "",
    eventId: selectedEvent?.id ?? "",
  });
  const [selectionPending, startSelectionTransition] = useTransition();
  const history = api.hackathonEvent.listCheckInHistory.useInfiniteQuery(
    { hackathonId: selectedHackathon?.id ?? "", limit: 25 },
    {
      enabled: selectedHackathon !== null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );
  const historyRows = flattenCheckInHistoryPages(history.data?.pages);
  const checkIn = api.hackathonEvent.checkInHacker.useMutation();
  const retryRoles = api.hackathonEvent.retryDiscordRoles.useMutation();

  const stationScope = `${selectedHackathon?.id ?? ""}:${requestedEventId ?? ""}`;
  const [calledClassId, setCalledClassId] = useScopedState(stationScope, "");
  const [allowRepeat, setAllowRepeat] = useScopedState(stationScope, false);
  const [stationMode, setStationMode] = useScopedState<"manual" | "scanner">(
    stationScope,
    "scanner",
  );
  const [cameraOpen, setCameraOpen] = useScopedState(stationScope, false);
  const [cameraError, setCameraError] = useScopedState<string | null>(
    stationScope,
    null,
  );
  const [manualQuery, setManualQuery] = useScopedState(stationScope, "");
  const [selectedAttendeeId, setSelectedAttendeeId] = useScopedState(
    stationScope,
    "",
  );
  const [result, setResult] = useState<HackathonCheckInResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [highlightedAttemptId, setHighlightedAttemptId] = useState<
    string | null
  >(null);
  const scanning = useRef(false);
  const generation = useRef(0);
  const handledQrPayloads = useRef(new Set<string>());
  const qrLastSeenAt = useRef(new Map<string, number>());

  const manualSearch = api.hackathonEvent.searchCheckInHackers.useQuery(
    {
      hackathonId: selectedHackathon?.id ?? "",
      limit: 10,
      query: manualQuery.trim().length >= 2 ? manualQuery.trim() : "aa",
    },
    {
      enabled: selectedHackathon !== null && manualQuery.trim().length >= 2,
    },
  );

  const primary = selectedEvent?.purpose === "primary_check_in";
  const stationReady =
    !selectionPending &&
    selectedEvent !== null &&
    selectedEvent.ready &&
    (!primary || eventData.data?.configReady === true) &&
    (primary || calledClassId !== "");

  useEffect(() => {
    generation.current += 1;
    scanning.current = false;
    handledQrPayloads.current.clear();
    qrLastSeenAt.current.clear();
  }, [stationScope]);

  useEffect(() => {
    if (!cameraOpen) return;
    const interval = window.setInterval(
      () =>
        rearmAbsentCheckInQrPayloads(
          handledQrPayloads.current,
          qrLastSeenAt.current,
        ),
      250,
    );
    return () => window.clearInterval(interval);
  }, [cameraOpen]);

  useEffect(() => {
    if (!highlightedAttemptId) return;
    const timeout = window.setTimeout(
      () => setHighlightedAttemptId(null),
      1800,
    );
    return () => window.clearTimeout(timeout);
  }, [highlightedAttemptId]);

  function replaceSelection(hackathonId: string, eventId?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("hackathon", hackathonId);
    if (eventId) params.set("event", eventId);
    else params.delete("event");
    startSelectionTransition(() => {
      setSelection({ hackathonId, eventId: eventId ?? "" });
      router.replace(`/admin/hackathon-check-in?${params.toString()}`);
    });
  }

  function present(value: unknown) {
    const nextResult = adaptResult(
      value,
      selectedEvent
        ? { name: selectedEvent.name, purpose: selectedEvent.purpose }
        : undefined,
    );
    setResult(nextResult);
    setResultOpen(true);
    return nextResult;
  }

  async function submit(
    input:
      | { attendeeId: string; source: "manual" }
      | { allowRepeat: boolean; qrPayload: string; source: "scanner" },
  ) {
    if (!selectedHackathon || !selectedEvent || !stationReady) return;
    const requestGeneration = generation.current;
    try {
      const next = await checkIn.mutateAsync({
        ...input,
        calledClassId:
          primary || calledClassId === "all" ? null : calledClassId,
        eventId: selectedEvent.id,
        hackathonId: selectedHackathon.id,
      });
      if (requestGeneration !== generation.current) return;
      const presented = present(next);
      if (presented.attemptId !== "unknown") {
        setHighlightedAttemptId(presented.attemptId);
      }
      void history.refetch().catch(() => undefined);
    } catch {
      if (requestGeneration !== generation.current) return;
      present({
        event: selectedEvent,
        outcome: "unknown",
        roleDelivery: null,
      });
    }
  }

  async function reopenAttempt(attemptId: string) {
    if (!selectedHackathon) return;
    const attempt = await utils.hackathonEvent.getCheckInAttempt.fetch({
      attemptId,
      hackathonId: selectedHackathon.id,
    });
    present(attempt);
  }

  const stationLoading =
    hackathons.isPending ||
    (selectedHackathon !== null && eventData.isPending && !eventData.data);

  if (stationLoading) {
    return (
      <main
        className={adminPageLayoutClassName}
        data-testid="hackathon-check-in-workspace"
      >
        <AdminPageHeader
          description="Select a hackathon and event, set this station's class policy, then scan or search."
          eyebrow={ADMIN_PAGE_EYEBROWS.hackathonCheckIn}
          icon={ScanLine}
          title="Hackathon Check-in"
        />
        <CheckInWorkspaceSkeleton />
      </main>
    );
  }

  return (
    <main
      className={adminPageLayoutClassName}
      data-testid="hackathon-check-in-workspace"
    >
      <AdminPageHeader
        actions={
          <Button
            className="min-h-11 gap-2"
            onClick={() => void history.refetch()}
            variant="outline"
          >
            <History className="size-4" aria-hidden="true" /> Refresh history
          </Button>
        }
        description="Select a hackathon and event, set this station's class policy, then scan or search."
        eyebrow={ADMIN_PAGE_EYEBROWS.hackathonCheckIn}
        icon={ScanLine}
        title="Hackathon Check-in"
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0 border-white/10 bg-card/95 shadow-2xl shadow-black/25">
          <CardHeader>
            <CardTitle>Station</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="hackathon-check-in-scope">Hackathon</Label>
                <select
                  aria-busy={selectionPending}
                  className="h-11 min-w-0 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={checkIn.isPending || resultOpen}
                  id="hackathon-check-in-scope"
                  onChange={(event) => replaceSelection(event.target.value)}
                  value={selection.hackathonId}
                >
                  {hackathons.data?.map((hackathon) => (
                    <option key={hackathon.id} value={hackathon.id}>
                      {hackathon.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hackathon-check-in-event">Event</Label>
                <select
                  aria-busy={selectionPending}
                  className="h-11 min-w-0 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={
                    checkIn.isPending ||
                    resultOpen ||
                    eventData.isPending ||
                    selection.hackathonId !== selectedHackathon?.id
                  }
                  id="hackathon-check-in-event"
                  onChange={(event) => {
                    if (selection.hackathonId)
                      replaceSelection(
                        selection.hackathonId,
                        event.target.value,
                      );
                  }}
                  value={selection.eventId}
                >
                  <option value="">Select an event</option>
                  {eventData.data?.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.purpose === "primary_check_in" ? "Primary · " : ""}
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedEvent ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-background/60 p-3">
                <Badge variant={primary ? "outline" : "secondary"}>
                  {primary ? "Primary hackathon admission" : "Event attendance"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatClubDateTime(selectedEvent.startDateTime)} ·{" "}
                  {selectedEvent.points} points
                </span>
              </div>
            ) : null}

            {!primary && selectedEvent ? (
              <div
                className={`grid gap-3 ${
                  showHackathonRepeatControl(primary, stationMode)
                    ? "sm:grid-cols-2"
                    : ""
                }`}
              >
                <div className="grid gap-2">
                  <Label htmlFor="called-class">Called class</Label>
                  <select
                    className="h-11 min-w-0 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={checkIn.isPending || resultOpen}
                    id="called-class"
                    onChange={(event) => setCalledClassId(event.target.value)}
                    value={calledClassId}
                  >
                    <option value="">Select the class being called</option>
                    <option value="all">All classes</option>
                    {eventData.data?.classes
                      .filter(
                        (hackathonClass) => hackathonClass.kind === "class",
                      )
                      .map((hackathonClass) => (
                        <option
                          key={hackathonClass.id}
                          value={hackathonClass.id}
                        >
                          {hackathonClass.name}
                        </option>
                      ))}
                  </select>
                </div>
                {showHackathonRepeatControl(primary, stationMode) ? (
                  <div className="flex min-h-11 items-center justify-between gap-3 self-end rounded-md border border-white/10 bg-background/60 px-3 py-2">
                    <Label htmlFor="hackathon-allow-repeat">
                      Allow repeat attendance
                    </Label>
                    <Switch
                      checked={allowRepeat}
                      disabled={checkIn.isPending || resultOpen}
                      id="hackathon-allow-repeat"
                      onCheckedChange={setAllowRepeat}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {primary && eventData.data && !eventData.data.configReady ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  This hackathon is not ready for check-in. Finish its role and
                  class configuration first.
                </p>
              </div>
            ) : null}

            <Tabs
              onValueChange={(value) => {
                const next = value === "manual" ? "manual" : "scanner";
                setStationMode(next);
                if (next === "manual") setCameraOpen(false);
              }}
              value={stationMode}
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger
                  className="min-h-11 gap-2"
                  disabled={checkIn.isPending || resultOpen}
                  value="scanner"
                >
                  <QrCode className="size-4" aria-hidden="true" /> Scanner
                </TabsTrigger>
                <TabsTrigger
                  className="min-h-11 gap-2"
                  disabled={checkIn.isPending || resultOpen}
                  value="manual"
                >
                  <UserCheck className="size-4" aria-hidden="true" /> Manual
                </TabsTrigger>
              </TabsList>
              <TabsContent
                className="data-[state=active]:animate-in data-[state=active]:fade-in mt-4 grid gap-4 data-[state=active]:duration-150 motion-reduce:animate-none"
                value="scanner"
              >
                <Button
                  className="min-h-11 gap-2"
                  disabled={!stationReady || checkIn.isPending || resultOpen}
                  onClick={() => {
                    setCameraError(null);
                    setCameraOpen((current) => {
                      if (!current) {
                        handledQrPayloads.current.clear();
                        qrLastSeenAt.current.clear();
                      }
                      return !current;
                    });
                  }}
                >
                  {cameraOpen ? (
                    <CameraOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Camera className="size-4" aria-hidden="true" />
                  )}
                  {cameraOpen ? "Close scanner" : "Open scanner"}
                </Button>
                {cameraOpen ? (
                  <div className="animate-in fade-in overflow-hidden rounded-md border border-white/10 bg-background/60 p-2 duration-200 motion-reduce:animate-none">
                    <Scanner
                      allowMultiple={CHECK_IN_QR_SCANNER_OPTIONS.allowMultiple}
                      components={{
                        tracker: (codes) =>
                          observeCheckInQrPayloads(qrLastSeenAt.current, codes),
                      }}
                      constraints={{ facingMode: "environment" }}
                      formats={["qr_code"]}
                      onError={() =>
                        setCameraError(
                          "Camera access is unavailable. Use Manual check-in instead.",
                        )
                      }
                      onScan={(codes) => {
                        if (!stationReady || resultOpen || checkIn.isPending)
                          return;
                        const payload = claimCheckInQrPayload(
                          scanning,
                          handledQrPayloads.current,
                          codes,
                        );
                        if (!payload) return;
                        void submit({
                          allowRepeat,
                          qrPayload: payload,
                          source: "scanner",
                        }).finally(() => {
                          releaseCheckInQrPayload(scanning);
                        });
                      }}
                      scanDelay={CHECK_IN_QR_SCANNER_OPTIONS.scanDelay}
                    />
                    {cameraError ? (
                      <p className="p-3 text-sm text-destructive">
                        {cameraError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent
                className="data-[state=active]:animate-in data-[state=active]:fade-in mt-4 grid gap-3 data-[state=active]:duration-150 motion-reduce:animate-none"
                value="manual"
              >
                <div className="grid gap-2">
                  <Label htmlFor="hackathon-hacker-search">Hacker</Label>
                  <Input
                    className="h-11 bg-background/70"
                    disabled={!stationReady || checkIn.isPending || resultOpen}
                    id="hackathon-hacker-search"
                    onChange={(event) => {
                      setManualQuery(event.target.value);
                      setSelectedAttendeeId("");
                    }}
                    placeholder="Search name or email"
                    value={manualQuery}
                  />
                </div>
                {manualQuery.trim().length >= 2 ? (
                  <div className="max-h-56 divide-y divide-border/70 overflow-y-auto rounded-md border border-white/10 bg-background/60">
                    {manualSearch.isPending ? (
                      <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                        Searching…
                      </p>
                    ) : manualSearch.data?.length ? (
                      manualSearch.data.map((hacker) => (
                        <button
                          aria-pressed={
                            selectedAttendeeId === hacker.attendeeId
                          }
                          className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          key={hacker.attendeeId}
                          onClick={() =>
                            setSelectedAttendeeId(hacker.attendeeId)
                          }
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {hacker.name}
                            </span>
                            <span className="block truncate text-sm text-muted-foreground">
                              {hacker.email}
                            </span>
                          </span>
                          <Badge variant="outline">{hacker.status}</Badge>
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-sm text-muted-foreground">
                        No hackers found.
                      </p>
                    )}
                  </div>
                ) : null}
                <Button
                  className="min-h-11 gap-2"
                  disabled={
                    !stationReady || !selectedAttendeeId || checkIn.isPending
                  }
                  onClick={() =>
                    void submit({
                      attendeeId: selectedAttendeeId,
                      source: "manual",
                    })
                  }
                >
                  <UserCheck className="size-4" aria-hidden="true" />
                  Check in selected hacker
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-white/10 bg-card/95 shadow-xl shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5" aria-hidden="true" /> Recent history
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Shared across stations for this hackathon.
            </p>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {history.isPending ? (
              <CheckInHistorySkeleton />
            ) : historyRows.length ? (
              <>
                <ol className="max-h-[22rem] divide-y divide-border/70 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                  {historyRows.map((attempt) => (
                    <li
                      className={`transition-colors duration-700 motion-reduce:transition-none ${
                        highlightedAttemptId === attempt.attemptId
                          ? "bg-primary/15 ring-1 ring-inset ring-primary/35"
                          : ""
                      }`}
                      key={attempt.attemptId}
                    >
                      <button
                        className="min-h-11 w-full min-w-0 px-4 py-3 text-left hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => void reopenAttempt(attempt.attemptId)}
                        type="button"
                      >
                        <span className="block truncate font-medium">
                          {attempt.hackerName ?? "Unknown hacker"}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {attempt.eventName} ·{" "}
                          {attempt.outcome.replaceAll("_", " ")}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {formatClubDateTime(
                            attempt.checkedInAt,
                            "Not recorded",
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                {history.hasNextPage ? (
                  <div className="border-t border-border/70 p-3">
                    <Button
                      className="min-h-11 w-full gap-2"
                      disabled={history.isFetchingNextPage}
                      onClick={() => void history.fetchNextPage()}
                      variant="secondary"
                    >
                      {history.isFetchingNextPage ? (
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      Load more history
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No check-in attempts recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <CheckInResultDialog
        onOpenChange={setResultOpen}
        onRetryRoles={
          result?.roleDelivery?.needsAttention && selectedHackathon
            ? () => {
                void retryRoles
                  .mutateAsync({
                    attemptId: result.attemptId,
                    hackathonId: selectedHackathon.id,
                  })
                  .then((delivery) => {
                    setResult((current) =>
                      current
                        ? {
                            ...current,
                            roleDelivery: adaptRoleDelivery(delivery),
                          }
                        : current,
                    );
                  })
                  .then(() =>
                    utils.hackathonEvent.listCheckInHistory.invalidate(),
                  );
              }
            : undefined
        }
        open={resultOpen}
        result={result}
        retryingRoles={retryRoles.isPending}
      />
    </main>
  );
}
