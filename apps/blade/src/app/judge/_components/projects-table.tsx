"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import { api } from "~/trpc/react";
import { RubricForm } from "./rubric-form";

interface Submission {
  id: string;
  projectName: string;
  devpost?: string | null;
  description: string;
  challenge: string;
  challengeId?: string | null;
  teamId?: string | null;
  judgedStatus?: string | null;
  hackathonId?: string | null;
}

interface Judge {
  id: string;
  name: string;
  location: string;
  challengeId: string;
  challengeTitle: string;
}

export function ProjectsTable({ hackathonId }: { hackathonId?: string }) {
  const [challengeFilter, setChallengeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>("");

  const {
    data = [],
    isLoading,
    error,
  } = api.judge.getSubmissions.useQuery({
    hackathonId,
  });

  const { data: judges = [], isLoading: judgesLoading } =
    api.judge.getJudges.useQuery();

  const submissions = data as Submission[];
  const judgesList = judges as Judge[];

  // Unique, sorted challenges (ignore empty-ish)
  const uniqueChallenges = useMemo(() => {
    const set = new Set(
      submissions
        .map((p) => p.challenge.trim())
        .filter((c): c is string => Boolean(c && c.length > 0)),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  // Filter data based on selected challenge and search query
  const filteredData = useMemo(() => {
    let filtered = submissions;

    // Filter by challenge
    if (challengeFilter) {
      filtered = filtered.filter((p) => p.challenge === challengeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.projectName.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.challenge.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [submissions, challengeFilter, searchQuery]);

  if (isLoading) {
    return <div>Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load submissions.</div>;
  }

  if (!submissions.length) {
    return <div>No submissions found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Judge Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Judge Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="judge-select" className="text-sm font-medium">
              Select Your Judge Profile:
            </label>
            <select
              id="judge-select"
              value={selectedJudgeId}
              onChange={(e) => setSelectedJudgeId(e.target.value)}
              className="min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              disabled={judgesLoading}
            >
              <option value="">
                {judgesLoading ? "Loading judges..." : "Select a judge"}
              </option>
              {judgesList.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.name} - {judge.challengeTitle}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects by name, description, or challenge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Challenge Filter */}
            <div className="flex items-center gap-4">
              <label htmlFor="challenge-filter" className="text-sm font-medium">
                Filter by Challenge:
              </label>
              <select
                id="challenge-filter"
                value={challengeFilter}
                onChange={(e) => setChallengeFilter(e.target.value)}
                className="min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Challenges</option>
                {uniqueChallenges.map((challenge) => (
                  <option key={challenge} value={challenge}>
                    {challenge}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600">
              Showing {filteredData.length} of {submissions.length} projects
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Project Name</TableHead>
            <TableHead>Devpost</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Challenge</TableHead>
            <TableHead className="text-center">Evaluation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">
                {project.projectName}
              </TableCell>
              <TableCell>
                {project.devpost ? (
                  <a
                    href={project.devpost}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Devpost
                  </a>
                ) : (
                  <span className="text-gray-400">No Devpost</span>
                )}
              </TableCell>
              <TableCell>{project.description}</TableCell>
              <TableCell className="text-right">{project.challenge}</TableCell>
              <TableCell className="text-center">
                {selectedJudgeId ? (
                  <RubricForm
                    submissionId={project.id}
                    judgeId={selectedJudgeId}
                    projectName={project.projectName}
                    size="sm"
                  />
                ) : (
                  <div className="text-sm text-gray-500">
                    Select a judge to evaluate
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
