import { EVENTS } from "@forge/consts";

/**
 * Blade renders every timestamp in club time (`EVENTS.CALENDAR_TIME_ZONE`), so a
 * member's join date, their detail dialog, and the audit entry for that action
 * all read the same no matter where the viewer is sitting.
 *
 * The `formatUtc*` helpers are the deliberate exception. Date-only columns
 * (graduation dates, term dates, calendar day keys) are stored as `YYYY-MM-DD`
 * with no instant attached, so rendering them in a zone west of UTC would shift
 * them back a day.
 */

export type DateInput = Date | number | string;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_ONLY = /^\d{4}-\d{2}$/;

/**
 * Parses whatever a Blade surface hands us into a `Date`, or `null` when the
 * value is missing or unparseable. Date-only and month-only strings are anchored
 * at noon UTC so no timezone can nudge them onto a neighbouring day.
 */
function toDate(value: DateInput | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    if (DATE_ONLY.test(value)) return new Date(`${value}T12:00:00.000Z`);
    if (MONTH_ONLY.test(value)) return new Date(`${value}-01T12:00:00.000Z`);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function render(
  formatter: Intl.DateTimeFormat,
  value: DateInput | null | undefined,
  fallback: string,
) {
  const date = toDate(value);
  return date ? formatter.format(date) : fallback;
}

const clubDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

const clubLongDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

const clubDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

const clubFullDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

const clubTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

const clubDayTime = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
});

/** `Jul 27, 2026` in club time. */
export function formatClubDate(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubDate, value, fallback);
}

/** `July 27, 2026` in club time. */
export function formatClubLongDate(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubLongDate, value, fallback);
}

/** `Jul 27, 2026, 7:00 PM` in club time. */
export function formatClubDateTime(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubDateTime, value, fallback);
}

/** `Monday, July 27, 2026 at 7:00 PM` in club time. */
export function formatClubFullDateTime(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubFullDateTime, value, fallback);
}

/** `7:00 PM` in club time. */
export function formatClubTime(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubTime, value, fallback);
}

/** `Jul 27, 7:00 PM` in club time. */
export function formatClubDayTime(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(clubDayTime, value, fallback);
}

/** Event start/end presenter shared by the member and admin event surfaces. */
export function formatEventDateTime(value: DateInput | null | undefined) {
  return formatClubDateTime(value, "Date unavailable");
}

const utcDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const utcFullDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeZone: "UTC",
});

const utcDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const utcMonth = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const utcShortMonth = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

/** `Jul 27, 2026` for a date-only column. Never shifts by timezone. */
export function formatUtcDate(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(utcDate, value, fallback);
}

/** `Monday, July 27, 2026` for a date-only column. Never shifts by timezone. */
export function formatUtcFullDate(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(utcFullDate, value, fallback);
}

/**
 * `Jul 27, 2026, 7:00 PM` for a zoneless `date` + `time` column pair, where the
 * stored wall clock is the value to show and no conversion is wanted.
 */
export function formatUtcDateTime(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(utcDateTime, value, fallback);
}

/** `July 2026` for a `YYYY-MM` column. Never shifts by timezone. */
export function formatUtcMonth(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(utcMonth, value, fallback);
}

/** `Jul 2026` for a `YYYY-MM` column. Never shifts by timezone. */
export function formatUtcShortMonth(
  value: DateInput | null | undefined,
  fallback = "—",
) {
  return render(utcShortMonth, value, fallback);
}

const clubWallClockParts = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
  year: "numeric",
});

/** The wall-clock fields someone in club time would read off a clock. */
export function clubWallClock(value: DateInput) {
  const parts = Object.fromEntries(
    clubWallClockParts
      .formatToParts(value instanceof Date ? value : new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    seconds: `${parts.hour}:${parts.minute}:${parts.second}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** `YYYY-MM-DD` for the club-time calendar day containing `value`. */
export function clubDateKey(value: DateInput = new Date()) {
  return clubWallClock(value).date;
}

/** `YYYY-MM-DDTHH:mm`, the value shape a `datetime-local` input expects. */
export function clubDateTimeInput(value: DateInput) {
  const { date, time } = clubWallClock(value);
  return `${date}T${time}`;
}

/** `YYYY-MM-DDTHH:mm:ss` in club time. */
export function clubDateTimeSeconds(value: DateInput) {
  const { date, seconds } = clubWallClock(value);
  return `${date}T${seconds}`;
}

const clubOffsetParts = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
  timeZoneName: "longOffset",
});

/** The club-time UTC offset in effect at `value`, for example `-04:00`. */
export function clubUtcOffset(value: DateInput) {
  return clubOffsetParts
    .formatToParts(value instanceof Date ? value : new Date(value))
    .find((part) => part.type === "timeZoneName")
    ?.value.replace("GMT", "");
}

export function localNewYorkDateTime(
  value: string,
  selectedOffset?: "-04:00" | "-05:00",
) {
  if (/[-+]\d{2}:\d{2}$/.test(value)) return value;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const wallTime = normalized.slice(0, 19);
  const validOffsets = (["-04:00", "-05:00"] as const).filter(
    (offset) =>
      clubDateTimeSeconds(new Date(`${wallTime}${offset}`)) === wallTime,
  );
  if (validOffsets.length === 0) {
    throw new Error(
      `Choose a valid ${EVENTS.CALENDAR_TIME_ZONE} date and time.`,
    );
  }
  if (validOffsets.length > 1 && !selectedOffset) {
    throw new Error(
      "Choose the first or second occurrence of the repeated time.",
    );
  }
  const offset = selectedOffset ?? validOffsets[0];
  if (!offset || !validOffsets.includes(offset)) {
    throw new Error("Choose a valid occurrence for the repeated time.");
  }
  return `${wallTime}${offset}`;
}
