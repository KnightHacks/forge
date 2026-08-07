const DAY_MS = 24 * 60 * 60 * 1000;

function epochDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  if (!year || !month || !day) return null;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return Math.floor(timestamp / DAY_MS);
}

/** Calculates consecutive active-day streaks from calendar-local date keys. */
export function calculateActivityStreaks(
  dates: readonly string[],
  observationDate: string,
) {
  const days = [
    ...new Set(
      dates.flatMap((date) => {
        const day = epochDay(date);
        return day === null ? [] : [day];
      }),
    ),
  ].sort((left, right) => left - right);

  let longestStreakDays = 0;
  let runningStreakDays = 0;
  let previousDay: number | null = null;
  for (const day of days) {
    runningStreakDays =
      previousDay !== null && day === previousDay + 1
        ? runningStreakDays + 1
        : 1;
    longestStreakDays = Math.max(longestStreakDays, runningStreakDays);
    previousDay = day;
  }

  const observedDay = epochDay(observationDate);
  const lastDay = days.at(-1);
  if (
    observedDay === null ||
    lastDay === undefined ||
    (lastDay !== observedDay && lastDay !== observedDay - 1)
  ) {
    return { currentStreakDays: 0, longestStreakDays };
  }

  let currentStreakDays = 1;
  for (let index = days.length - 2; index >= 0; index -= 1) {
    const day = days[index];
    const next = days[index + 1];
    if (day === undefined || next === undefined || day !== next - 1) break;
    currentStreakDays += 1;
  }

  return { currentStreakDays, longestStreakDays };
}
