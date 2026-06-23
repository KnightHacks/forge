"use client";

import { createContext, useContext } from "react";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

const HackathonContext = createContext<SelectHackathon | null>(null);

export function BaseHackathonMissingError() {
  return (
    <div className="flex flex-col items-center justify-center gap-y-6 px-4 py-12 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h3 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
          Hackathon Unavailable
        </h3>
        <p className="max-w-xl text-red-700 dark:text-red-300">
          This hackathon dashboard is only available while the hackathon is
          running. Please check back during the event.
        </p>
      </div>
    </div>
  );
}

export function HackathonProvider({
  children,
  hackathon,
}: {
  children: React.ReactNode;
  hackathon?: SelectHackathon | null;
}) {
  if (!hackathon) {
    return <BaseHackathonMissingError />;
  }

  return (
    <HackathonContext.Provider value={hackathon}>
      {children}
    </HackathonContext.Provider>
  );
}

export function useCurrentHackathon() {
  const hackathon = useContext(HackathonContext);

  if (!hackathon) {
    throw new Error(
      "useCurrentHackathon must be used inside HackathonProvider",
    );
  }

  return hackathon;
}
