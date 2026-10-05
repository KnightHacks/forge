"use client";

import { useEffect, useState } from "react";

import { useHackerSchedule, usePublicHackathon } from "@forge/hacker-sdk/react";

import { getCurrentEvents } from "./current-events";

export function useCurrentEvents(checkedIn: boolean) {
  const schedule = useHackerSchedule({ enabled: checkedIn });
  const hackathon = usePublicHackathon();
  const [now, setNow] = useState(() => Date.now());
  const { refetch } = schedule;

  useEffect(() => {
    if (!checkedIn) return;
    const poll = window.setInterval(() => void refetch(), 60_000);
    return () => window.clearInterval(poll);
  }, [checkedIn, refetch]);

  useEffect(() => {
    if (!checkedIn) return;
    // Wake at the next start/end boundary, including after a suspended tab
    // resumes. Also sample the clock so local clock changes are reflected.
    const clockNow = Date.now();
    const nextBoundary = Math.min(
      clockNow + 30_000,
      ...(schedule.data?.events.flatMap((event) =>
        [Date.parse(event.startAt), Date.parse(event.endAt)].filter(
          (time) => time > clockNow,
        ),
      ) ?? []),
    );
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextBoundary - clockNow),
    );
    return () => window.clearTimeout(timer);
  }, [checkedIn, now, schedule.data]);

  return {
    events: getCurrentEvents(schedule.data?.events ?? [], now),
    loading: schedule.isPending || hackathon.isPending,
    error: schedule.isError || hackathon.isError,
    refreshing: schedule.isFetching || hackathon.isFetching,
    retry: () => Promise.all([schedule.refetch(), hackathon.refetch()]),
    timezone: hackathon.data?.timezone ?? "America/New_York",
  };
}
