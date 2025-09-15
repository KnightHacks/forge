"use client";

import React from "react";

import { HACKER_CLIENT_STATUS_LIST } from "~/consts";
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
  const counts = data as Record<string, number>;

  const HACKER_CLIENT_STATUS_LIST_CLIENT = HACKER_CLIENT_STATUS_LIST.map(
    (meta) => ({
      ...meta,
      count: counts[meta.label] ?? -1,
    }),
  );
  return (
    <div>
      <div className="mb-10 grid grid-cols-1 gap-5 gap-x-14 border-b-2 pb-7 text-xl font-bold sm:grid-cols-2">
        {HACKER_CLIENT_STATUS_LIST_CLIENT.map(
          ({ label, status, count, color }) => (
            <HackerStatusCard
              key={label}
              status={status}
              statusCount={count}
              color={color}
              onClickChangeState={() => onClick(label)}
            />
          ),
        )}
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
