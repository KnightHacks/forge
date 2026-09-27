import { cn } from "@forge/ui";

import { formatEventDate } from "../_lib/club-events";

export function ClubEventDate({
  className,
  dayClassName,
  startDateTime,
}: {
  className?: string;
  dayClassName?: string;
  startDateTime: string;
}) {
  const eventDate = formatEventDate(startDateTime);

  return (
    <time
      dateTime={startDateTime}
      className={cn(
        "club-event-row-date flex w-fit min-w-16 flex-col items-center text-center font-black uppercase",
        className,
      )}
    >
      <span className="text-xs leading-4 text-white/65">{eventDate.month}</span>
      <span
        className={cn(
          "club-event-row-day text-5xl leading-none text-white",
          dayClassName,
        )}
      >
        {eventDate.day}
      </span>
      <span className="mt-1 text-xs leading-4 text-white/65">
        {eventDate.dayName}
      </span>
    </time>
  );
}
