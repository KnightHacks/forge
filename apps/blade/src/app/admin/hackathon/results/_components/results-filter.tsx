"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

export default function ResultsFilter() {
  // Mock data
  const judges = [
    { id: "1", name: "Ethan" },
    { id: "2", name: "Lenny" },
    { id: "3", name: "Dylan" },
  ];

  const challenges = [
    { id: "1", title: "Google" },
    { id: "2", title: "Nvidia" },
    { id: "3", title: "OneEthos" },
  ];

  const rooms = [
    { id: "1", name: "Room A" },
    { id: "2", name: "Room B" },
    { id: "3", name: "Room C" },
  ];

  const [filters, setFilters] = useState({
    judge: null as string | null,
    challenge: null as string | null,
    room: null as string | null,
  });

  return (
    <div className="mt-2 mb-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Judge Filter */}
      <Select
        value={filters.judge ?? ""}
        onValueChange={(id) => setFilters((f) => ({ ...f, judge: id }))}
      >
        <SelectTrigger className="w-full md:w-1/3" aria-label="Select a judge">
          <SelectValue placeholder="Filter by Judge..." />
        </SelectTrigger>
        <SelectContent>
          {judges.map((j) => (
            <SelectItem key={j.id} value={j.id}>
              {j.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Challenge Filter */}
      <Select
        value={filters.challenge ?? ""}
        onValueChange={(id) => setFilters((f) => ({ ...f, challenge: id }))}
      >
        <SelectTrigger className="w-full md:w-1/3" aria-label="Select a challenge">
          <SelectValue placeholder="Filter by Challenge..." />
        </SelectTrigger>
        <SelectContent>
          {challenges.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Room Filter */}
      <Select
        value={filters.room ?? ""}
        onValueChange={(id) => setFilters((f) => ({ ...f, room: id }))}
      >
        <SelectTrigger className="w-full md:w-1/3" aria-label="Select a room">
          <SelectValue placeholder="Filter by Room..." />
        </SelectTrigger>
        <SelectContent>
          {rooms.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
