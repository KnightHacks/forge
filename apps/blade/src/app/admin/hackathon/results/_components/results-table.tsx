"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import ResultsFilter from "./results-filter";
import SortButton from "~/app/admin/_components/SortButton";

export default function ResultsTable() {
  const [sortField, setSortField] = useState<"name" | "specificRating" | "overallRating" | null>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock filter data
  const judges = [
    { id: "1", name: "Lenny" },
    { id: "2", name: "Ethan" },
  ];
  const challenges = [
    { id: "1", title: "Google" },
    { id: "2", title: "Nvidia" },
    { id: "3", title: "OneEthos" },
  ];
  const rooms = [
    { id: "1", name: "Room A" },
    { id: "2", name: "Room B" },
  ];

  // Mock projects
  const projects = useMemo(() => [
    {
      id: "p1",
      name: "Project 1",
      devpost: "https://devpost.com/securedrive",
      status: "Winner",
      challenges: ["Google", "Nvidia"],
      specificRating: 9.2,
      overallRating: 8.7,
    },
    {
      id: "p2",
      name: "Project 2",
      devpost: "https://devpost.com/codevault",
      status: "Participant",
      challenges: ["OneEthos"],
      specificRating: 7.5,
      overallRating: 7.8,
    },
    {
      id: "p3",
      name: "Project 3",
      devpost: "https://devpost.com/chainguard",
      status: "Winner",
      challenges: ["Google", "OneEthos"],
      specificRating: 9.8,
      overallRating: 9.5,
    },
    {
      id: "p4",
      name: "Project 4",
      devpost: "https://devpost.com/bugbountyhub",
      status: "Participant",
      challenges: ["Nvidia", "OneEthos"],
      specificRating: 8.1,
      overallRating: 8.0,
    },
  ], []);

  const [filters, setFilters] = useState({
    judge: null as { id: string; name: string } | null,
    challenge: null as { id: string; title: string } | null,
    room: null as { id: string; name: string } | null,
  });

  // --- Derived filtered/sorted data ---
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by challenge (mock behavior)
    if (filters.challenge)
      result = result.filter((p) =>
        p.challenges.includes(filters.challenge!.title),
      );

    // TODO: judge and room filters can later be added here

    if (searchTerm)
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [projects, filters, searchTerm, sortField, sortOrder]);

  // --- Derived stats ---
  const totalProjects = filteredProjects.length;
  const avgScore =
    totalProjects > 0
      ? (
          filteredProjects.reduce((sum, p) => sum + p.overallRating, 0) /
          totalProjects
        ).toFixed(1)
      : "0.0";

  return (
    <main className="container h-screen">
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
          Results Dashboard
        </h1>
      </div>

      {/* Search + Filters */}
      <div className="relative w-full flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Projects"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <ResultsFilter
          judges={judges}
          challenges={challenges}
          rooms={rooms}
          onFilterChange={setFilters}
        />

        <div className="flex justify-center gap-8 text-md font-bold">
          <div>
            Returned {totalProjects} Project{totalProjects !== 1 ? "s" : ""}
          </div>
          <div>
            Average Rating: {avgScore}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">
              <SortButton
                field="name"
                label="Project Name"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center"><Label>Link</Label></TableHead>
            <TableHead className="text-center"><Label>Status</Label></TableHead>
            <TableHead className="text-center"><Label>Challenges</Label></TableHead>
            <TableHead className="text-center">
              <SortButton
                field="specificRating"
                label="Challenge Rating"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center">
              <SortButton
                field="overallRating"
                label="Overall Rating"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="text-center font-medium">{project.name}</TableCell>
                <TableCell className="text-center">
                  <a
                    href={project.devpost}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Devpost
                  </a>
                </TableCell>
                <TableCell className="text-center">
                  {project.status === "Winner" ? (
                    <span className="rounded bg-green-500 px-2 py-1 text-white">
                      Winner
                    </span>
                  ) : (
                    <span className="rounded bg-gray-600 px-2 py-1 text-white">
                      Submitted
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center max-w-[180px] truncate">
                  <span title={project.challenges.join(", ")}>
                    {project.challenges.join(", ")}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                    {filters.challenge ? project.specificRating : "—"}
                </TableCell>
                <TableCell className="text-center">{project.overallRating}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}
