export interface PortalScheduleEvent {
  description: string;
  endDateTime: Date;
  id: string;
  location: string;
  name: string;
  points: number;
  purpose: "event" | "primary_check_in";
  startDateTime: Date;
  tag: string;
}

export interface PortalScheduleDay {
  dateLabel: string;
  events: PortalScheduleEvent[];
  key: string;
}

function getDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function groupScheduleByDay(
  events: PortalScheduleEvent[],
  timeZone: string,
): PortalScheduleDay[] {
  const groups = new Map<string, PortalScheduleEvent[]>();
  const sortedEvents = [...events].sort(
    (left, right) =>
      left.startDateTime.getTime() - right.startDateTime.getTime(),
  );

  for (const event of sortedEvents) {
    const key = getDateKey(event.startDateTime, timeZone);
    const dayEvents = groups.get(key);
    if (dayEvents) {
      dayEvents.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  });

  return Array.from(groups, ([key, dayEvents]) => {
    const firstEvent = dayEvents[0];
    if (!firstEvent) return null;

    return {
      dateLabel: dateFormatter.format(firstEvent.startDateTime),
      events: dayEvents,
      key,
    };
  }).filter((day): day is PortalScheduleDay => day !== null);
}

export function formatScheduleTimeRange(
  startDateTime: Date,
  endDateTime: Date,
  timeZone: string,
) {
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const start = timeFormatter.format(startDateTime);
  const end = timeFormatter.format(endDateTime);

  if (
    getDateKey(startDateTime, timeZone) === getDateKey(endDateTime, timeZone)
  ) {
    return `${start} – ${end}`;
  }

  const endFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
  });

  return `${start} – ${endFormatter.format(endDateTime)}`;
}
