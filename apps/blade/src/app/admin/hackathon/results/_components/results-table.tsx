"use client";

import { api } from "~/trpc/react";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import ResultsFilter from "./results-filter";
import SortButton from "~/app/admin/_components/SortButton";

export default function ResultsTable() {
  const [filters, setFilters] = useState({
    judge: null as { id: string; name: string } | null,
    challenge: null as { id: string; title: string } | null,
  });

  const [sortField, setSortField] = useState<"projectTitle" | "specificRating" | "overallRating" | null>("projectTitle");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all judged submissions without filters
  const { data: judgedSubmissions, isLoading } = api.judgeSubmissions.getJudgedSubmissions.useQuery({});
 
  // Transform submissions into projects
  const allProjects = useMemo(() => {
    if (!judgedSubmissions) return [];

    return judgedSubmissions.map((s) => {
      const ratings = [
        s.originality_rating,
        s.design_rating,
        s.technical_understanding_rating,
        s.implementation_rating,
        s.wow_factor_rating,
      ].filter((r) => r);

      const average = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      return {
        id: s.id,
        projectTitle: s.projectTitle,
        devpostUrl: s.devpostUrl,
        challengeTitle: s.challengeTitle,
        judgeName: s.judgeName,
        originality_rating: s.originality_rating,
        design_rating: s.design_rating,
        technical_understanding_rating: s.technical_understanding_rating,
        implementation_rating: s.implementation_rating,
        wow_factor_rating: s.wow_factor_rating,
        privateFeedback: s.privateFeedback,
        publicFeedback: s.publicFeedback,
        overallRating: Number(average.toFixed(1)),
        specificRating: Number(average.toFixed(1)),
      };
    });
  }, [judgedSubmissions]);

  // Extract judges and challenges for filters
  const judges = useMemo(() => {
    if (!judgedSubmissions) return [];
    const uniqueJudges = new Map<string, string>();
    judgedSubmissions.forEach((s) => {
      if (s.judgeName) {
        uniqueJudges.set(s.judgeName, s.judgeName);
      }
    });
    return Array.from(uniqueJudges.entries()).map(([name]) => ({
      id: name,
      name,
    }));
  }, [judgedSubmissions]);

  const challenges = useMemo(() => {
    if (!judgedSubmissions) return [];
    const uniqueChallenges = new Map<string, string>();
    judgedSubmissions.forEach((s) => {
      if (s.challengeTitle) {
        uniqueChallenges.set(s.challengeTitle, s.challengeTitle);
      }
    });
    return Array.from(uniqueChallenges.entries()).map(([title]) => ({
      id: title,
      title,
    }));
  }, [judgedSubmissions]);

  // Apply client-side filtering and sorting
  const filteredProjects = useMemo(() => {
    let result = [...allProjects];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((p) =>
        p.projectTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply judge filter
    if (filters.judge) {
      result = result.filter((p) => p.judgeName === filters.judge?.name);
    }

    // Apply challenge filter
    if (filters.challenge) {
      result = result.filter((p) => p.challengeTitle === filters.challenge?.title);
    }

    // Apply sorting
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        let aVal: string | number | null;
        let bVal: string | number | null;

        if (sortField === "projectTitle") {
          aVal = a.projectTitle.toLowerCase();
          bVal = b.projectTitle.toLowerCase();
        } else {
          aVal = a[sortField];
          bVal = b[sortField];
        }

        // Handle null values
        if (aVal && bVal) return 0;
        if (aVal) return sortOrder === "asc" ? 1 : -1;
        if (bVal) return sortOrder === "asc" ? -1 : 1;

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allProjects, searchTerm, filters, sortField, sortOrder]);

  // Calculate statistics
  const totalProjects = filteredProjects.length;
  const avgScore =
    totalProjects > 0
      ? (
          filteredProjects.reduce((sum, p) => sum + (p.overallRating), 0) /
          totalProjects
        ).toFixed(1)
      : "0.0";

  // Calculate judging counts per project
  const judgingCounts = useMemo(() => {
    const counts = new Map<string, { judged: number; submitted: number }>();
    allProjects.forEach((p) => {
      if (p.projectTitle) {
        const current = counts.get(p.projectTitle) ?? { judged: 0, submitted: 0 };
        current.judged += 1;
        current.submitted += 1; // This assumes  all submissions are judged for now (should get updated)
        counts.set(p.projectTitle, current);
      }
    });
    return counts;
  }, [allProjects]);

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
          onFilterChange={setFilters}
        />

        <div className="flex justify-center gap-8 text-md font-bold">
          <div>
            Returned {totalProjects} Project{totalProjects !== 1 ? "s" : ""}
          </div>
          <div>Average Rating: {avgScore}</div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">
              <SortButton
                field="projectTitle"
                label="Project Name"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center"><Label>Link</Label></TableHead>
            <TableHead className="text-center"><Label>Judging Status</Label></TableHead>
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Loading results...
              </TableCell>
            </TableRow>
          ) : !judgedSubmissions?.length || filteredProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            filteredProjects.map((project) => {
              const counts = judgingCounts.get(project.projectTitle) ?? { judged: 0, submitted: 0 };
              const ratio = `${counts.judged}/${counts.submitted}`;

              return (
                <TableRow key={project.id}>
                  <TableCell className="text-center font-medium">
                    {project.projectTitle}
                  </TableCell>
                  <TableCell className="text-center">
                    {project.devpostUrl ? (
                      <a
                        href={project.devpostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Devpost
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">{ratio}</TableCell>
                  <TableCell className="text-center max-w-[180px] truncate">
                    <span title={project.challengeTitle}>
                      {project.challengeTitle}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {project.specificRating}
                  </TableCell>
                  <TableCell className="text-center">
                    {project.overallRating}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </main>
  );
}