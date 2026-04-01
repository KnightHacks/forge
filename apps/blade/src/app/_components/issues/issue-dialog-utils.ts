import { EVENTS, ISSUE } from "@forge/consts";

export function defaultEventForm(): ISSUE.EventFormValues {
  return {
    discordId: "",
    googleId: "",
    name: "",
    tag: EVENTS.EVENT_TAGS[0],
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    roles: [],
    dues_paying: false,
    isOperationsCalendar: false,
    discordChannelId: "",
    points: undefined,
    hackathonId: undefined,
  };
}

export function getStatusLabel(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeTaskDueDate(dateValue?: string | Date) {
  const dueDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(dueDate.getTime())) {
    const fallback = new Date();
    fallback.setHours(ISSUE.TASK_DUE_HOURS, ISSUE.TASK_DUE_MINUTES, 0, 0);
    return fallback;
  }

  dueDate.setHours(ISSUE.TASK_DUE_HOURS, ISSUE.TASK_DUE_MINUTES, 0, 0);
  return dueDate;
}

export function getTaskDueDateInputValue(dateValue: Date) {
  return normalizeTaskDueDate(dateValue).toISOString().slice(0, 10);
}

export function parseTimeTo12h(timeValue?: string): {
  hour: string;
  minute: string;
  amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number];
} {
  const [hRaw, mRaw] = (timeValue ?? "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return {
      hour: "",
      minute: "",
      amPm: "PM" as (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number],
    };
  }

  const amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number] =
    h >= 12 ? "PM" : "AM";
  const hour24 = h % 12 || 12;
  return {
    hour: hour24.toString().padStart(2, "0"),
    minute: m.toString().padStart(2, "0"),
    amPm,
  };
}

export function to24h(
  hour12: string,
  amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number],
) {
  let h = Number(hour12);
  if (Number.isNaN(h)) {
    h = 0;
  }
  if (amPm === "PM" && h < 12) {
    h += 12;
  }
  if (amPm === "AM" && h === 12) {
    h = 0;
  }
  return h.toString().padStart(2, "0");
}

export function toAmPmValue(
  value: string,
): (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number] {
  return value === "AM" ? "AM" : "PM";
}

export function parseEventDateTime(dateValue?: string, timeValue?: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

// ─── Generic tree helpers ─────────────────────────────────────────────────────

export function updateTreeNode<T extends { children: T[] }>(
  nodes: T[],
  id: string,
  patch: Partial<T>,
  getId: (n: T) => string,
): T[] {
  return nodes.map((n) => {
    if (getId(n) === id) return { ...n, ...patch };
    return { ...n, children: updateTreeNode(n.children, id, patch, getId) };
  });
}

export function removeTreeNode<T extends { children: T[] }>(
  nodes: T[],
  id: string,
  getId: (n: T) => string,
): T[] {
  return nodes
    .filter((n) => getId(n) !== id)
    .map((n) => ({ ...n, children: removeTreeNode(n.children, id, getId) }));
}

export function addChildToTreeNode<T extends { children: T[] }>(
  nodes: T[],
  parentId: string,
  newChild: T,
  getId: (n: T) => string,
): T[] {
  return nodes.map((n) => {
    if (getId(n) === parentId)
      return { ...n, children: [...n.children, newChild] };
    return {
      ...n,
      children: addChildToTreeNode(n.children, parentId, newChild, getId),
    };
  });
}
