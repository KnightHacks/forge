"use client";

import { useState } from "react";

import { HACKER_STATUS_MAP } from "~/consts";
import HackerStatusCounter from "./_components/hacker-status-counter";
import HackerTable from "./_components/hackers-table";
import RepeatDropdown from "./_components/repeat-dropdown";
import HackerScanner from "./_components/scanner";

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
      <div className="mb-9 flex justify-center">
        <HackerScanner />
      </div>
      <div className="flex justify-center">
<<<<<<< HEAD
<<<<<<< HEAD
        <RepeatDropdown hackathonId={currentActiveHackathon?.id ?? ""} />
=======
        Allow repeat check-ins placeholder
>>>>>>> 84787acd (I don't knw what happened and how it was fixed but qr scanner just kept scanning twice for some reason so changing the timeout I think mad eit so scans once every 9 seconds, not sure if it will go back to scanning twice but something here worked)
=======
        <RepeatDropdown />
>>>>>>> bb2cee49 (prettier format and added some logic to get the alowed repeated checkin ppl to checkin and have thier status for repeatedcheckin become false)
      </div>

      <div className="rounded-xl pb-8">
        <HackerTable filterStatus={filterStatus} />
      </div>
    </main>
  );
}
