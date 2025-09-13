"use client";

import React from "react";

import { api } from "~/trpc/react";
import HackerStatusCard from "./hacker-status-counter-card";

const HackerStatusCounter = ({
  hackathonId,
  onClick,
}: {
  hackathonId: string;
  onClick: (status: string | null) => void;
}) => {
  const { data, isLoading, error } =
    api.hacker.statusCountByHackathonId.useQuery(hackathonId);
  if (isLoading) return <span>Loading…</span>;
  if (error || !data) return <span>Failed to load</span>;
  const {
    accepted,
    confirmed,
    pending,
    waitlisted,
    denied,
    withdrawn,
    checkedin,
  } = data;

  const statusList = [
    {
      label: "accepted",
      status: "Accepted",
      count: accepted,
      color: "#6BCB77",
    },
    {
      label: "confirmed",
      status: "Confirmed",
      count: confirmed,
      color: "#00C9A7",
    },
    { label: "pending", status: "Pending", count: pending, color: "#FFD93D" },
    {
      label: "waitlisted",
      status: "Waitlisted",
      count: waitlisted,
      color: "#4D96FF",
    },
    { label: "denied", status: "Denied", count: denied, color: "#FF5E5E" },
    {
      label: "withdrawn",
      status: "Withdrawn",
      count: withdrawn,
      color: "#FF6B6B",
    },
    {
      label: "checkedin",
      status: "Checked-In",
      count: checkedin,
      color: "#845EC2",
    },
  ];
  return (
    <div>
      <div className="mb-10 grid grid-cols-1 gap-5 gap-x-14 border-b-2 pb-7 text-xl font-bold sm:grid-cols-2">
        {statusList.map(({ status, count, color, label }) => (
          <HackerStatusCard
            key={status}
            status={status}
            statusCount={count}
            color={color}
            onClickChangeState={() => onClick(label)}
          />
        ))}
        <div
          className="flex justify-center gap-1 rounded-xl border-2 p-4 font-bold hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => onClick(null)}
        >
          <div>View all Hackers</div>
        </div>
      </div>
    </div>
  );
};

export default HackerStatusCounter;
