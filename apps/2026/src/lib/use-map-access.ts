"use client";

import { useEffect, useState } from "react";

import { getHackerMapAccess } from "@forge/hacker-sdk";
import {
  useHackerDashboard,
  usePublicHackathon,
} from "@forge/hacker-sdk/react";

/** Shared by the navigation and direct route so a locked map never mounts. */
export function useMapAccess() {
  const dashboardQuery = useHackerDashboard();
  const hackathonQuery = usePublicHackathon();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 15_000);
    const refreshClock = () => setNow(new Date());
    window.addEventListener("focus", refreshClock);
    return () => {
      window.clearInterval(clock);
      window.removeEventListener("focus", refreshClock);
    };
  }, []);

  const hackathon = hackathonQuery.data;
  const isPending = dashboardQuery.isPending || hackathonQuery.isPending;
  const isError = dashboardQuery.isError || hackathonQuery.isError;
  const access =
    hackathon && !isPending && !isError
      ? getHackerMapAccess({
          now,
          startsAt: hackathon.startDate,
          status: dashboardQuery.data.application?.status ?? null,
          timeZone: hackathon.timezone,
        })
      : "locked-date";
  let opensOn = "the first day of the event";
  try {
    if (hackathon)
      opensOn = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: hackathon.timezone,
      }).format(new Date(hackathon.startDate));
  } catch {
    // Keep the locked state usable when event timing is unavailable.
  }
  const reason =
    access === "locked-status"
      ? `Available to confirmed hackers from ${opensOn}.`
      : `Opens ${opensOn} for confirmed hackers.`;

  return {
    available: access === "available",
    isError,
    isPending,
    reason,
    retry: () =>
      Promise.all([dashboardQuery.refetch(), hackathonQuery.refetch()]),
  };
}
