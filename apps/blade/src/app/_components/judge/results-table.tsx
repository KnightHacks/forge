"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Code,
  ExternalLink,
  Eye,
  Lightbulb,
  Palette,
  Search,
  Star,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Separator } from "@forge/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import SortButton from "~/app/_components/shared/SortButton";
import { api } from "~/trpc/react";
import ResultsFilter from "./results-filter";

export default function ResultsTable() {
  const [filters, setFilters] = useState({
    judge: null as { id: string; name: string } | null,
    challenge: null as { id: string; title: string } | null,
  });

  const [sortField, setSortField] = useState<
    "projectTitle" | "specificRating" | "overallRating" | "judgeCount" | null
  >("projectTitle");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all judged submissions without filters
  const { data: judgedSubmissions, isLoading } =
    api.judge.getJudgedSubmissions.useQuery({});

  // Transform submissions into projects, merging by submission ID
  const allProjects = useMemo(() => {
    if (!judgedSubmissions) return [];

    // Group submissions by submission ID
    const submissionGroups = new Map<string, typeof judgedSubmissions>();

    judgedSubmissions.forEach((submission) => {
      const { submissionId } = submission;

      // Get existing group or initialize a new one
      const group = submissionGroups.get(submissionId) ?? [];
      group.push(submission);

      // Re-set the group (important if it was newly created)
      submissionGroups.set(submissionId, group);
    });

    // Convert groups to projects
    return Array.from(submissionGroups.entries()).map(
      ([submissionId, submissions]) => {
        const firstSubmission = submissions[0];

        // Calculate average ratings across all judges
        const allRatings = submissions.flatMap((s) =>
          [
            s.originality_rating,
            s.design_rating,
            s.technical_understanding_rating,
            s.implementation_rating,
            s.wow_factor_rating,
          ].filter((r) => r),
        );

        const averageRating =
          allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
            : 0;

        // Calculate average for each category
        const calculateCategoryAverage = (
          category:
            | "originality_rating"
            | "design_rating"
            | "technical_understanding_rating"
            | "implementation_rating"
            | "wow_factor_rating",
        ): number => {
          const categoryRatings = submissions.map((s) => s[category]);
          return categoryRatings.length > 0
            ? categoryRatings.reduce((sum, r) => sum + r, 0) /
                categoryRatings.length
            : 0;
        };

        return {
          id: submissionId,
          projectTitle: firstSubmission?.projectTitle,
          devpostUrl: firstSubmission?.devpostUrl,
          challengeTitle: firstSubmission?.challengeTitle,
          judgeCount: submissions.length,
          judgeNames: submissions.map((s) => s.judgeName).filter(Boolean),
          submissions: submissions, // Store all submissions for detailed view
          originality_rating: Number(
            calculateCategoryAverage("originality_rating").toFixed(1),
          ),
          design_rating: Number(
            calculateCategoryAverage("design_rating").toFixed(1),
          ),
          technical_understanding_rating: Number(
            calculateCategoryAverage("technical_understanding_rating").toFixed(
              1,
            ),
          ),
          implementation_rating: Number(
            calculateCategoryAverage("implementation_rating").toFixed(1),
          ),
          wow_factor_rating: Number(
            calculateCategoryAverage("wow_factor_rating").toFixed(1),
          ),
          overallRating: Number(averageRating.toFixed(1)),
          specificRating: Number(averageRating.toFixed(1)),
        };
      },
    );
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
        p.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply judge filter - check if any of the judge names match
    if (filters.judge) {
      result = result.filter((p) =>
        p.judgeNames.includes(filters.judge?.name || ""),
      );
    }

    // Apply challenge filter
    if (filters.challenge) {
      result = result.filter(
        (p) => p.challengeTitle === filters.challenge?.title,
      );
    }

    // Apply Sorting
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        let aVal: string | number | null | undefined;
        let bVal: string | number | null | undefined;

        if (sortField === "projectTitle") {
          aVal = a.projectTitle?.toLowerCase();
          bVal = b.projectTitle?.toLowerCase();
        } else {
          aVal = a[sortField];
          bVal = b[sortField];
        }

        // Handle null/undefined values
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Compare values
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allProjects, searchTerm, filters, sortField, sortOrder]);

  // Calculate statistics
  const totalProjects = filteredProjects.length;
  const totalEvaluations = filteredProjects.reduce(
    (sum, p) => sum + p.judgeCount,
    0,
  );
  const avgScore =
    totalProjects > 0
      ? (
          filteredProjects.reduce((sum, p) => sum + p.overallRating, 0) /
          totalProjects
        ).toFixed(1)
      : "0.0";

  const getRatingBadgeVariant = (
    rating: number,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (rating >= 4.5) return "default";
    if (rating >= 3.5) return "secondary";
    if (rating >= 2.5) return "outline";
    return "destructive";
  };

  return (
    <main className="container h-screen">
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
          Results
        </h1>
      </div>

      {/* Search + Filters */}
      <div className="relative mb-4 flex w-full flex-col gap-3">
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

        <div className="text-md flex justify-center gap-8 font-bold">
          <div>
            {totalProjects} Project{totalProjects !== 1 ? "s" : ""} (
            {totalEvaluations} Evaluations)
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
            <TableHead className="text-center">
              <Label>Link</Label>
            </TableHead>
            <TableHead className="text-center">
              <SortButton
                field="judgeCount"
                label="Judges"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center">
              <Label>Challenges</Label>
            </TableHead>
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
            <TableHead className="text-center">
              <Label>Details</Label>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center">
                Loading results...
              </TableCell>
            </TableRow>
          ) : !judgedSubmissions?.length || filteredProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center">
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            filteredProjects.map((project) => {
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
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-xs">
                        {project.judgeCount} Judge
                        {project.judgeCount !== 1 ? "s" : ""}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {project.judgeNames.slice(0, 2).join(", ")}
                        {project.judgeNames.length > 2 &&
                          ` +${project.judgeNames.length - 2} more`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-center">
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
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-2xl">
                            <Award className="h-6 w-6 text-primary" />
                            {project.projectTitle}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Project Info Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="font-normal"
                                  >
                                    <Users className="mr-1 h-3 w-3" />
                                    Judges ({project.judgeCount})
                                  </Badge>
                                  <span className="font-medium">
                                    {project.judgeNames.join(", ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="font-normal"
                                  >
                                    <Award className="mr-1 h-3 w-3" />
                                    Challenge
                                  </Badge>
                                  <span
                                    className="truncate font-medium"
                                    title={project.challengeTitle}
                                  >
                                    {project.challengeTitle}
                                  </span>
                                </div>
                                {project.devpostUrl && (
                                  <div className="col-span-full">
                                    <a
                                      href={project.devpostUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      View Project on Devpost
                                    </a>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          <Separator />

                          {/* Overall Average Ratings */}
                          <div>
                            <div className="mb-4 flex items-center gap-2">
                              <Star className="h-5 w-5 text-primary" />
                              <h3 className="text-xl font-semibold">
                                Overall Average Ratings
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <Card>
                                <CardContent className="space-y-3 pt-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                                      <span className="text-sm font-medium">
                                        Originality
                                      </span>
                                    </div>
                                    <Badge
                                      variant={getRatingBadgeVariant(
                                        project.originality_rating,
                                      )}
                                    >
                                      {project.originality_rating || "—"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Palette className="h-4 w-4 text-pink-500" />
                                      <span className="text-sm font-medium">
                                        Design
                                      </span>
                                    </div>
                                    <Badge
                                      variant={getRatingBadgeVariant(
                                        project.design_rating,
                                      )}
                                    >
                                      {project.design_rating || "—"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Code className="h-4 w-4 text-blue-500" />
                                      <span className="text-sm font-medium">
                                        Technical
                                      </span>
                                    </div>
                                    <Badge
                                      variant={getRatingBadgeVariant(
                                        project.technical_understanding_rating,
                                      )}
                                    >
                                      {project.technical_understanding_rating ||
                                        "—"}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="space-y-3 pt-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Award className="h-4 w-4 text-green-500" />
                                      <span className="text-sm font-medium">
                                        Implementation
                                      </span>
                                    </div>
                                    <Badge
                                      variant={getRatingBadgeVariant(
                                        project.implementation_rating,
                                      )}
                                    >
                                      {project.implementation_rating || "—"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-purple-500" />
                                      <span className="text-sm font-medium">
                                        Wow Factor
                                      </span>
                                    </div>
                                    <Badge
                                      variant={getRatingBadgeVariant(
                                        project.wow_factor_rating,
                                      )}
                                    >
                                      {project.wow_factor_rating || "—"}
                                    </Badge>
                                  </div>

                                  <Separator />

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                      <span className="text-sm font-bold">
                                        Overall Average
                                      </span>
                                    </div>
                                    <Badge
                                      variant="default"
                                      className="text-base font-bold"
                                    >
                                      {project.overallRating}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          <Separator />

                          {/* Individual Judge Evaluations */}
                          <div>
                            <div className="mb-4 flex items-center gap-2">
                              <Users className="h-5 w-5 text-primary" />
                              <h3 className="text-xl font-semibold">
                                Individual Judge Evaluations
                              </h3>
                            </div>

                            <div className="space-y-4">
                              {project.submissions.map((submission, index) => {
                                const submissionRatings = [
                                  submission.originality_rating,
                                  submission.design_rating,
                                  submission.technical_understanding_rating,
                                  submission.implementation_rating,
                                  submission.wow_factor_rating,
                                ].filter((r) => r);

                                const submissionAverage =
                                  submissionRatings.length > 0
                                    ? submissionRatings.reduce(
                                        (sum, r) => sum + r,
                                        0,
                                      ) / submissionRatings.length
                                    : 0;

                                return (
                                  <Card key={index}>
                                    <CardHeader>
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                          {submission.judgeName ||
                                            `Judge ${index + 1}`}
                                        </CardTitle>
                                        <Badge variant="outline">
                                          Avg: {submissionAverage.toFixed(1)}
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Originality
                                            </span>
                                            <Badge
                                              variant={
                                                submission.originality_rating
                                                  ? getRatingBadgeVariant(
                                                      submission.originality_rating,
                                                    )
                                                  : "outline"
                                              }
                                            >
                                              {submission.originality_rating ||
                                                "—"}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Design
                                            </span>
                                            <Badge
                                              variant={
                                                submission.design_rating
                                                  ? getRatingBadgeVariant(
                                                      submission.design_rating,
                                                    )
                                                  : "outline"
                                              }
                                            >
                                              {submission.design_rating || "—"}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Technical
                                            </span>
                                            <Badge
                                              variant={
                                                submission.technical_understanding_rating
                                                  ? getRatingBadgeVariant(
                                                      submission.technical_understanding_rating,
                                                    )
                                                  : "outline"
                                              }
                                            >
                                              {submission.technical_understanding_rating ||
                                                "—"}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Implementation
                                            </span>
                                            <Badge
                                              variant={
                                                submission.implementation_rating
                                                  ? getRatingBadgeVariant(
                                                      submission.implementation_rating,
                                                    )
                                                  : "outline"
                                              }
                                            >
                                              {submission.implementation_rating ||
                                                "—"}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Wow Factor
                                            </span>
                                            <Badge
                                              variant={
                                                submission.wow_factor_rating
                                                  ? getRatingBadgeVariant(
                                                      submission.wow_factor_rating,
                                                    )
                                                  : "outline"
                                              }
                                            >
                                              {submission.wow_factor_rating ||
                                                "—"}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Feedback for this judge */}
                                      {(submission.publicFeedback ||
                                        submission.privateFeedback) && (
                                        <div className="mt-4 space-y-2">
                                          {submission.publicFeedback && (
                                            <div>
                                              <Badge className="mb-2">
                                                Public Feedback
                                              </Badge>
                                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                {submission.publicFeedback}
                                              </p>
                                            </div>
                                          )}
                                          {submission.privateFeedback && (
                                            <div>
                                              <Badge
                                                variant="secondary"
                                                className="mb-2"
                                              >
                                                Private Feedback
                                              </Badge>
                                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                {submission.privateFeedback}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
