"use client";

import { useState } from "react";

import HackerStatusCounter from "./_components/hacker-status-counter";
import HackerTable from "./_components/hackers-table";
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

      <div className="mb-9 flex justify-center">
        <HackerScanner />
      </div>

      <div className="rounded-xl pb-8">
        <HackerTable filterStatus={filterStatus} />
      </div>
    </main>
  );
}
