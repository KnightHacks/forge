"use client";

import { useState } from "react";

import HackerStatusCounter from "~/app/_components/admin/hackathon/hackers/hacker-status-counter";
import HackerTable from "~/app/_components/admin/hackathon/hackers/hackers-table";
import { HACKER_STATUS_MAP } from "~/consts";

export default function HackersClient({
  currentActiveHackathon,
}: {
  currentActiveHackathon: { id: string } | null;
}) {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  return (
    <main className="container h-screen">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="py-12">
          <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
            Hacker Dashboard
          </h1>
        </div>
      </div>

      <div>
        {currentActiveHackathon ? (
          <HackerStatusCounter
            hackathonId={currentActiveHackathon.id}
            onClick={setFilterStatus}
          />
        ) : (
          <div>No upcoming hackathon.</div>
        )}
      </div>
      <div className="mb-6 text-center text-lg font-medium">
        {filterStatus ? (
          <div className="text-center">
            <span>You are currently viewing hackers with the status: </span>
            {filterStatus in HACKER_STATUS_MAP ? (
              <span
                className={
                  HACKER_STATUS_MAP[
                    filterStatus as keyof typeof HACKER_STATUS_MAP
                  ].color
                }
              >
                {
                  HACKER_STATUS_MAP[
                    filterStatus as keyof typeof HACKER_STATUS_MAP
                  ].name
                }
              </span>
            ) : (
              (() => {
                return (
                  <span>
                    You are seeing this because the filterStatus does not match
                    with hack status map, I got lazy and told typescript to just
                    trust me, sorry lol
                  </span>
                );
              })()
            )}
          </div>
        ) : (
          <div>You are currently viewing all hackers.</div>
        )}
      </div>

      <div className="rounded-xl pb-8">
        <HackerTable filterStatus={filterStatus} />
      </div>
    </main>
  );
}
