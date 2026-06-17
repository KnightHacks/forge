import { getBladeTrpcClient } from "./blade-trpc";

export interface PublicClubEvent {
  id: string;
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  tag: string;
}

export type EventsStatus = "loading" | "ready" | "error";

export const CLUB_TIME_ZONE = "America/New_York";
const DEFAULT_EVENT_LIMIT = 24;
const EVENT_FETCH_TIMEOUT_MS = 8_000;

interface BladeEventRecord {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  startDateTime?: unknown;
  endDateTime?: unknown;
  location?: unknown;
  tag?: unknown;
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeBladeEvents(
  value: unknown,
  limit = DEFAULT_EVENT_LIMIT,
): PublicClubEvent[] {
  if (!Array.isArray(value)) return [];

  const now = new Date();

  return value
    .map((event): PublicClubEvent | null => {
      if (!event || typeof event !== "object") return null;

      const bladeEvent = event as BladeEventRecord;
      const startDate = toDate(bladeEvent.startDateTime);
      const endDate = toDate(bladeEvent.endDateTime);

      if (
        !startDate ||
        !endDate ||
        startDate <= now ||
        typeof bladeEvent.id !== "string" ||
        typeof bladeEvent.name !== "string" ||
        typeof bladeEvent.description !== "string" ||
        typeof bladeEvent.location !== "string" ||
        typeof bladeEvent.tag !== "string"
      ) {
        return null;
      }

      return {
        id: bladeEvent.id,
        name: bladeEvent.name,
        description: bladeEvent.description,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        location: bladeEvent.location,
        tag: bladeEvent.tag,
      };
    })
    .filter((event): event is PublicClubEvent => event !== null)
    .sort(
      (first, second) =>
        new Date(first.startDateTime).getTime() -
        new Date(second.startDateTime).getTime(),
    )
    .slice(0, limit);
}

function createBoundedSignal(signal: AbortSignal) {
  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => abortController.abort(),
    EVENT_FETCH_TIMEOUT_MS,
  );
  const abort = () => abortController.abort();

  if (signal.aborted) {
    abort();
  } else {
    signal.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: abortController.signal,
    clear: () => {
      globalThis.clearTimeout(timeoutId);
      signal.removeEventListener("abort", abort);
    },
  };
}

export async function loadClubEvents({
  bladeUrl,
  limit = DEFAULT_EVENT_LIMIT,
  signal,
}: {
  bladeUrl: string;
  limit?: number;
  signal: AbortSignal;
}): Promise<PublicClubEvent[]> {
  const boundedSignal = createBoundedSignal(signal);

  try {
    const events = await getBladeTrpcClient(
      bladeUrl,
    ).event.getPublicClubEvents.query(
      { limit },
      { signal: boundedSignal.signal },
    );

    return normalizeBladeEvents(events, limit);
  } finally {
    boundedSignal.clear();
  }
}

function getDatePart(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    ...options,
  }).format(date);
}

function getDateParts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    ...options,
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function formatEventTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return getDatePart(date, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .replace(/\s/g, "")
    .toUpperCase();
}

export function formatEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      month: "",
      dayName: "",
      day: "",
    };
  }

  return {
    month: getDatePart(date, { month: "short" }),
    dayName: getDatePart(date, { weekday: "short" }),
    day: getDatePart(date, { day: "2-digit" }),
  };
}

export function getEventDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return getClubDateKey(date);
}

export function getClubDateKey(date = new Date()) {
  const parts = getDateParts(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getClubCurrentMonth() {
  const parts = getDateParts(new Date(), {
    month: "2-digit",
    year: "numeric",
  });
  const year = Number(parts.year);
  const monthIndex = Number(parts.month) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return {
      year: new Date().getFullYear(),
      monthIndex: new Date().getMonth(),
    };
  }

  return { year, monthIndex };
}

export function getEventMonth(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = getDateParts(date, {
    month: "2-digit",
    year: "numeric",
  });
  const year = Number(parts.year);
  const monthIndex = Number(parts.month) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }

  return { year, monthIndex };
}

export function formatMonthLabel({
  year,
  monthIndex,
}: {
  year: number;
  monthIndex: number;
}) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}
