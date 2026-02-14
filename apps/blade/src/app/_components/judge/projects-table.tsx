"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@forge/ui/command";
import { Input } from "@forge/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
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
  hackathonId?: string | null;
}

interface Judge {
  id: string;
  name: string;
  roomName: string;
  challengeId: string;
  challengeTitle: string;
}

export function ProjectsTable({ hackathonId }: { hackathonId?: string }) {
  const [challengeFilter, setChallengeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>("");
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [judgeSearch, setJudgeSearch] = useState<string>("");
  const [openJudge, setOpenJudge] = useState(false);

  const {
    data = [],
    isLoading,
    error,
  } = api.judge.getSubmissions.useQuery({
    hackathonId,
  });

  const { data: judges = [], isLoading: judgesLoading } =
    api.judge.getJudges.useQuery();

  const { data: challenges = [] } = api.challenge.getChallenges.useQuery({
    hackathonId: hackathonId ?? "",
  });

  // Get submissions that have already been judged by the selected judge
  const { data: judgedSubmissions = [] } =
    api.judge.getJudgedSubmissions.useQuery(
      {},
      {
        enabled: !!selectedJudgeId,
      },
    );

  const submissions = data as Submission[];
  const judgesList = judges as Judge[];

  // Auto-filter challenge based on selected judge
  useEffect(() => {
    if (selectedJudge) {
      setChallengeFilter(selectedJudge.challengeId);
    } else {
      setChallengeFilter("");
    }
  }, [selectedJudge]);

  // Filter challenges to only show those that have submissions
  const challengesWithSubmissions = useMemo(() => {
    const submissionChallengeIds = new Set(
      submissions.map((s) => s.challengeId).filter(Boolean),
    );

    return challenges
      .filter((challenge) => submissionChallengeIds.has(challenge.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [challenges, submissions]);

  // Searchable judge list
  const filteredJudges = useMemo(() => {
    const q = judgeSearch.trim();
    if (!q) return judgesList;

    let regex: RegExp | null = null;
    try {
      regex = new RegExp(q, "i"); // 'i' for case-insensitive search
    } catch {
      // Invalid regex input — fallback to simple substring check
      return judgesList.filter((j) =>
        `${j.name} ${j.challengeTitle} ${j.roomName}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      );
    }

    return judgesList.filter((j) => {
      const haystack = `${j.name} ${j.challengeTitle} ${j.roomName}`;
      return regex.test(haystack);
    });
  }, [judgesList, judgeSearch]);

  // Filter logic
  const filteredData = useMemo(() => {
    let filtered = submissions;

    // Filter out submissions already judged by the selected judge
    if (selectedJudgeId && judgedSubmissions.length > 0) {
      const judgedSubmissionIds = new Set(
        judgedSubmissions
          .filter((js) => js.judgeId === selectedJudgeId)
          .map((js) => js.submissionId),
      );
      filtered = filtered.filter((p) => !judgedSubmissionIds.has(p.id));
    }

    // Filter by challenge ID
    if (challengeFilter && challengeFilter !== "all") {
      filtered = filtered.filter((p) => p.challengeId === challengeFilter);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.challenge.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [
    submissions,
    challengeFilter,
    searchQuery,
    selectedJudgeId,
    judgedSubmissions,
  ]);

  if (isLoading) return <div>Loading submissions...</div>;
  if (error)
    return <div className="text-red-600">Failed to load submissions.</div>;
  if (!submissions.length) return <div>No submissions found.</div>;

  return (
    <div className="space-y-6">
      {/* Judge selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Judge Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Search Judge</label>

            <Popover open={openJudge} onOpenChange={setOpenJudge}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openJudge}
                  className="w-full justify-between overflow-hidden"
                  disabled={judgesLoading}
                >
                  {selectedJudge
                    ? `${selectedJudge.name} — ${selectedJudge.challengeTitle}${
                        selectedJudge.roomName
                          ? ` (${selectedJudge.roomName})`
                          : ""
                      }`
                    : judgesLoading
                      ? "Loading judges..."
                      : "Select judge..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-full p-0">
                {/* Turn off built-in filtering so we can use regex */}
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search judges by name, challenge, or location (supports regex)..."
                    value={judgeSearch}
                    onValueChange={setJudgeSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No judges found.</CommandEmpty>
                    <CommandGroup>
                      {filteredJudges.map((judge) => (
                        <CommandItem
                          key={judge.id}
                          // value is still useful for a11y; filtering is custom
                          value={`${judge.name} ${judge.challengeTitle} ${judge.roomName}`}
                          onSelect={() => {
                            setSelectedJudge(judge);
                            setSelectedJudgeId(judge.id); // <-- important for RubricForm
                            setOpenJudge(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedJudge?.id === judge.id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {judge.name} — {judge.challengeTitle}
                            </span>
                            {judge.roomName ? (
                              <span className="text-sm text-muted-foreground">
                                {judge.roomName}
                              </span>
                            ) : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="challenge-filter" className="text-sm font-medium">
                Filter by Challenge:
              </label>
              <div className="flex items-center gap-2 overflow-hidden">
                <Select
                  value={challengeFilter}
                  onValueChange={setChallengeFilter}
                  disabled={!!selectedJudge}
                >
                  <SelectTrigger className="min-w-[50px] md:min-w-[200px]">
                    <SelectValue placeholder="All Challenges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Challenges</SelectItem>
                    {challengesWithSubmissions.map((challenge) => (
                      <SelectItem key={challenge.id} value={challenge.id}>
                        {challenge.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
