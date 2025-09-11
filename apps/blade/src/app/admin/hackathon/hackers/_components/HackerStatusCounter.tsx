"use client";

import React from "react";

import { api } from "~/trpc/react";

const HackerStatusCounter = ({ hackathonId }: { hackathonId: string }) => {
  const { data, isLoading, error } =
    api.hacker.statusCountsByHackathonId.useQuery(hackathonId);
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
  return (
    <div>
      <div className="mb-10 grid grid-cols-1 border-b-2 border-white/20 pb-7 text-xl font-bold sm:grid-cols-2">
        <div className="flex justify-center p-4">
          <div className="text-[#6BCB77]">Accepted: </div>
          <div>{accepted}</div>
        </div>
        <div className="flex justify-center p-4">
          <div className="text-[#00C9A7]">Confirmed: </div>
          <div>{confirmed}</div>
        </div>
        <div className="flex justify-center p-4">
          <div className="text-[#FFD93D]">Pending: </div>
          <div>{pending}</div>
        </div>

        <div className="flex justify-center p-4">
          <div className="text-[#4D96FF]">Waitlisted: </div>
          <div>{waitlisted}</div>
        </div>

        <div className="flex justify-center p-4">
          <div className="text-[#FF5E5E]">Denied: </div>
          <div>{denied}</div>
        </div>
        <div className="flex justify-center p-4">
          <div className="text-[#FF6B6B]">Withdrawn: </div>
          <div>{withdrawn}</div>
        </div>
        <div className="flex justify-center p-4">
          <div className="text-[#845EC2]">Checked In: </div>
          <div>{checkedin}</div>
        </div>
      </div>
    </div>
  );
};

export default HackerStatusCounter;
