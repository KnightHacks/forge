import type { FORMS } from "@forge/consts";

type HackerStatus = (typeof FORMS.HACKATHON_APPLICATION_STATES)[number];

const EDITABLE_STATUSES = new Set<HackerStatus>([
  "pending",
  "waitlisted",
  "accepted",
  "confirmed",
  "checkedin",
]);
const WITHDRAWABLE_STATUSES = new Set<HackerStatus>([
  "pending",
  "waitlisted",
  "accepted",
  "confirmed",
]);

export function deriveAgeOnDate(dob: string, at: Date) {
  const [birthYear, birthMonth, birthDay] = dob.split("-").map(Number);
  if (!birthYear || !birthMonth || !birthDay) return null;

  const year = at.getUTCFullYear();
  const month = at.getUTCMonth() + 1;
  const day = at.getUTCDate();
  const birthdayPassed =
    month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (birthdayPassed ? 0 : 1);
}

export function getParticipantCapabilities(input: {
  confirmationDeadline: Date;
  now: Date;
  start: Date;
  status: HackerStatus;
}) {
  const beforeStart = input.now < input.start;
  const editable = beforeStart && EDITABLE_STATUSES.has(input.status);

  return {
    canConfirm:
      input.status === "accepted" &&
      input.now <= input.confirmationDeadline &&
      beforeStart,
    canEdit: editable,
    canGetPass: input.status === "confirmed" || input.status === "checkedin",
    canViewLeaderboard:
      input.status === "confirmed" || input.status === "checkedin",
    canViewSchedule: input.status === "checkedin",
    canWithdraw: beforeStart && WITHDRAWABLE_STATUSES.has(input.status),
  };
}

export function rankLeaderboardRows<
  T extends { id: string; lastName: string; points: number },
>(rows: readonly T[]) {
  const sorted = [...rows].sort(
    (left, right) =>
      right.points - left.points ||
      left.lastName.localeCompare(right.lastName) ||
      left.id.localeCompare(right.id),
  );

  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || sorted[index - 1]?.points !== row.points) {
      rank = index + 1;
    }
    return { ...row, rank };
  });
}

export function toLeaderboardName(firstName: string, lastName: string) {
  const initial = Array.from(lastName.trim())[0];
  return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
}
