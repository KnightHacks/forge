"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

interface Judge {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
}

interface ResultsFilterProps {
  judges: Judge[];
  challenges: Challenge[];
  onFilterChange: (filters: { judge: string; challenge: string; }) => void;
}

export default function ResultsFilter({
  judges,
  challenges,
  onFilterChange,
}: ResultsFilterProps) {
  const [filters, setFilters] = useState<{ judge: string; challenge: string;}>({
    judge: "all",
    challenge: "all",
  });

  // Update parent when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  return (
    <div className="mt-2 mb-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
      {/* Judge Filter */}
      <Select
        value={filters.judge}
        onValueChange={(id) => setFilters((f) => ({ ...f, judge: id }))}
      >
        <SelectTrigger className="w-full" aria-label="Select a judge">
          <SelectValue placeholder="Filter by Judge..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Judges</SelectItem>
          {judges.map((j) => (
            <SelectItem key={j.id} value={j.id}>
              {j.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Challenge Filter */}
      <Select
        value={filters.challenge}
        onValueChange={(id) => setFilters((f) => ({ ...f, challenge: id }))}
      >
        <SelectTrigger className="w-full" aria-label="Select a challenge">
          <SelectValue placeholder="Filter by Challenge..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Challenges</SelectItem>
          {challenges.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
