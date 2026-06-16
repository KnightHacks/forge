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
const EVENT_FETCH_TIMEOUT_MS = 8_000;

export function normalizeEvents(value: unknown): PublicClubEvent[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (event): event is PublicClubEvent =>
      !!event &&
      typeof event === "object" &&
      typeof (event as PublicClubEvent).id === "string" &&
      typeof (event as PublicClubEvent).name === "string" &&
      typeof (event as PublicClubEvent).description === "string" &&
      typeof (event as PublicClubEvent).startDateTime === "string" &&
      typeof (event as PublicClubEvent).endDateTime === "string" &&
      typeof (event as PublicClubEvent).location === "string" &&
      typeof (event as PublicClubEvent).tag === "string",
  );
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

export async function loadClubEvents(
  eventsEndpoint: string,
  signal: AbortSignal,
): Promise<PublicClubEvent[]> {
  const boundedSignal = createBoundedSignal(signal);

  try {
    const response = await fetch(eventsEndpoint, {
      cache: "no-store",
      signal: boundedSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`Blade returned ${response.status}`);
    }

    const payload = (await response.json()) as { events?: unknown };

    return normalizeEvents(payload.events);
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
