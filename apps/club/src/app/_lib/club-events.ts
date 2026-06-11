export interface PublicClubEvent {
  id: string;
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  tag: string;
}

interface BladeRouterEvent {
  id: string;
  name: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  tag: string;
  isOperationsCalendar: boolean;
  hackathonId: string | null;
}

interface EventQueryPayloadItem {
  result?: {
    data?: {
      json?: unknown;
    };
  };
}

export type EventsStatus = "loading" | "ready" | "error";

export const CLUB_TIME_ZONE = "America/New_York";

const EVENT_QUERY_INPUT = encodeURIComponent(
  JSON.stringify({ 0: { json: null } }),
);

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

function normalizeBladeRouterEvents(value: unknown): PublicClubEvent[] {
  if (!Array.isArray(value)) return [];

  const now = Date.now();

  return value
    .filter(
      (event): event is BladeRouterEvent =>
        !!event &&
        typeof event === "object" &&
        typeof (event as BladeRouterEvent).id === "string" &&
        typeof (event as BladeRouterEvent).name === "string" &&
        typeof (event as BladeRouterEvent).description === "string" &&
        typeof (event as BladeRouterEvent).start_datetime === "string" &&
        typeof (event as BladeRouterEvent).end_datetime === "string" &&
        typeof (event as BladeRouterEvent).location === "string" &&
        typeof (event as BladeRouterEvent).tag === "string" &&
        typeof (event as BladeRouterEvent).isOperationsCalendar === "boolean",
    )
    .filter((event) => {
      const startsAt = new Date(event.start_datetime).getTime();

      return (
        Number.isFinite(startsAt) &&
        startsAt > now &&
        !event.isOperationsCalendar &&
        event.hackathonId == null
      );
    })
    .sort(
      (first, second) =>
        new Date(first.start_datetime).getTime() -
        new Date(second.start_datetime).getTime(),
    )
    .map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      startDateTime: event.start_datetime,
      endDateTime: event.end_datetime,
      location: event.location,
      tag: event.tag,
    }));
}

function getEventQueryEndpoint(eventsEndpoint: string) {
  const bladeUrl = new URL(eventsEndpoint);

  return `${bladeUrl.origin}/api/trpc/event.getEvents?batch=1&input=${EVENT_QUERY_INPUT}`;
}

function getRouterEventsFromPayload(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const [firstItem] = value as EventQueryPayloadItem[];

  return firstItem?.result?.data?.json;
}

async function loadPublicEvents(
  eventsEndpoint: string,
  signal: AbortSignal,
): Promise<PublicClubEvent[]> {
  const response = await fetch(eventsEndpoint, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Blade returned ${response.status}`);
  }

  const payload = (await response.json()) as { events?: unknown };

  return normalizeEvents(payload.events);
}

async function loadRouterEvents(
  eventsEndpoint: string,
  signal: AbortSignal,
): Promise<PublicClubEvent[]> {
  const response = await fetch(getEventQueryEndpoint(eventsEndpoint), {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Blade returned ${response.status}`);
  }

  const payload = (await response.json()) as unknown;

  return normalizeBladeRouterEvents(getRouterEventsFromPayload(payload));
}

export async function loadClubEvents(
  eventsEndpoint: string,
  signal: AbortSignal,
): Promise<PublicClubEvent[]> {
  try {
    return await loadPublicEvents(eventsEndpoint, signal);
  } catch {
    return loadRouterEvents(eventsEndpoint, signal);
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

  const parts = getDateParts(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
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
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}
