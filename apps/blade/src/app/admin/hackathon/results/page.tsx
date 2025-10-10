"use client";

import { useState } from "react";
import ResultsTable  from "./_components/results-table";

export default function ResultsDashboard() {
  // Mock data for now
  const judges = [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ];
  const challenges = [
    { id: "1", title: "AI Challenge" },
    { id: "2", title: "Web App Security" },
  ];
  const rooms = [
    { id: "1", name: "Room A" },
    { id: "2", name: "Room B" },
  ];
  const projects = [
    {
      id: "p1",
      name: "SecureDrive",
      judgeId: "1",
      challengeId: "1",
      roomId: "2",
    },
    {
      id: "p2",
      name: "CodeVault",
      judgeId: "2",
      challengeId: "2",
      roomId: "1",
    },
  ];

  const [filters, setFilters] = useState({
    judge: null,
    challenge: null,
    room: null,
  });

  const filteredProjects = projects
    ?.filter((p) => !filters.judge || p.judgeId === filters.judge)
    ?.filter((p) => !filters.challenge || p.challengeId === filters.challenge)
    ?.filter((p) => !filters.room || p.roomId === filters.room);

  return (
    <div className="space-y-4">
      <ResultsTable data={filteredProjects} />
    </div>
  );
}
