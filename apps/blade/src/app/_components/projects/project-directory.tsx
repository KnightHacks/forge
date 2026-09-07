"use client";

import { useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Eye, Search } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Switch } from "@forge/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { ProjectDetailDialog } from "./project-detail-dialog";

type Project = RouterOutputs["projects"]["listJudge"]["projects"][number];

export interface ProjectDirectoryInput {
  challengeIds: string[];
  direction: "asc" | "desc";
  includeJudged?: boolean;
  showInRoomOnly?: boolean;
  maxParticipants?: number;
  minParticipants?: number;
  page: number;
  pageSize: number;
  query: string;
  sort:
    | "challengeRating"
    | "participantCount"
    | "rating"
    | "scheduledAt"
    | "submittedAt"
    | "title";
}

export interface ProjectDirectoryData<TProject extends Project = Project> {
  challenges: { id: string; label: string }[];
  page: number;
  pageSize: number;
  projects: TProject[];
  totalCount: number;
}

function ProjectBadges({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {project.challenges.map((challenge) => (
        <Badge
          className={cn(
            challenge.evaluationCount > 0 &&
              (challenge.label === "General"
                ? "border-emerald-950 bg-emerald-950 text-emerald-100"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"),
          )}
          key={challenge.id}
          title={
            challenge.evaluationCount > 0
              ? `${challenge.evaluationCount} evaluation${challenge.evaluationCount === 1 ? "" : "s"}`
              : "Not yet evaluated"
          }
          variant={
            challenge.evaluationCount > 0
              ? "outline"
              : challenge.label === "General"
                ? "outline"
                : "secondary"
          }
        >
          {challenge.label}
        </Badge>
      ))}
    </div>
  );
}

type Navigate = (patch: Record<string, string | number | undefined>) => void;

function ProjectFilters({
  challenges,
  defaultChallengeLabel,
  input,
  lockedChallenge,
  navigate,
  showChallengeRatingSort,
  showPreviouslyJudgedFilter,
  showRoomFilter,
  roomFilterUnavailableReason,
  showRatingSort,
  showTeamSizeFilters,
}: {
  challenges: ProjectDirectoryData["challenges"];
  defaultChallengeLabel: string;
  input: ProjectDirectoryInput;
  lockedChallenge?: { id: string; label: string };
  navigate: Navigate;
  showChallengeRatingSort: boolean;
  showPreviouslyJudgedFilter: boolean;
  showRoomFilter: boolean;
  roomFilterUnavailableReason?: string;
  showRatingSort: boolean;
  showTeamSizeFilters: boolean;
}) {
  const [query, setQuery] = useState(input.query);
  const [minParticipants, setMinParticipants] = useState(
    input.minParticipants?.toString() ?? "",
  );
  const [maxParticipants, setMaxParticipants] = useState(
    input.maxParticipants?.toString() ?? "",
  );
  const filterableChallenges = challenges.filter(
    (challenge) => challenge.label !== "General",
  );
  const selectedChallenge = filterableChallenges.some(
    (challenge) => challenge.id === input.challengeIds[0],
  )
    ? input.challengeIds[0]
    : "";

  return (
    <section className="rounded-lg border border-white/10 bg-card/90 p-3 shadow-xl shadow-black/15 sm:p-4">
      <form
        className={`grid gap-3 ${showTeamSizeFilters ? "lg:grid-cols-[minmax(14rem,1fr)_minmax(12rem,16rem)_9rem_9rem_auto]" : "grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(14rem,1fr)_minmax(12rem,16rem)_auto]"}`}
        onSubmit={(event) => {
          event.preventDefault();
          const normalizedMaxParticipants =
            showTeamSizeFilters &&
            minParticipants &&
            maxParticipants &&
            Number(minParticipants) > Number(maxParticipants)
              ? ""
              : maxParticipants;
          if (showTeamSizeFilters) {
            setMaxParticipants(normalizedMaxParticipants);
          }
          navigate({
            maxParticipants: showTeamSizeFilters
              ? normalizedMaxParticipants || undefined
              : undefined,
            minParticipants: showTeamSizeFilters
              ? minParticipants || undefined
              : undefined,
            page: 1,
            query,
          });
        }}
      >
        <label
          className={`relative min-w-0 ${showTeamSizeFilters ? "" : "col-start-1 row-start-1 lg:col-auto lg:row-auto"}`}
        >
          <span className="sr-only">Search project titles</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="h-11 pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search project titles"
            value={query}
          />
        </label>
        {lockedChallenge ? (
          <div className="col-span-2 flex min-h-11 min-w-0 items-center rounded-md border border-primary/25 bg-primary/10 px-3 text-sm lg:col-span-1">
            <span className="truncate font-medium">
              {lockedChallenge.label}
            </span>
            <span className="ml-auto pl-3 text-xs text-muted-foreground">
              Room scope
            </span>
          </div>
        ) : (
          <label
            className={
              showTeamSizeFilters ? undefined : "col-span-2 lg:col-span-1"
            }
          >
            <span className="sr-only">Challenge</span>
            <select
              aria-label="Challenge"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) =>
                navigate({ challenge: event.target.value, page: 1 })
              }
              value={selectedChallenge}
            >
              <option value="">{defaultChallengeLabel}</option>
              {filterableChallenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showTeamSizeFilters
          ? (["min", "max"] as const).map((bound) => (
              <label key={bound}>
                <span className="sr-only">
                  {bound === "min" ? "Minimum" : "Maximum"} team size
                </span>
                <Input
                  className="h-11"
                  max={100}
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    bound === "min"
                      ? setMinParticipants(event.target.value)
                      : setMaxParticipants(event.target.value)
                  }
                  placeholder={
                    bound === "min" ? "Min team size" : "Max team size"
                  }
                  type="number"
                  value={bound === "min" ? minParticipants : maxParticipants}
                />
              </label>
            ))
          : null}
        <Button
          className={`h-11 ${showTeamSizeFilters ? "" : "col-start-2 row-start-1 lg:col-auto lg:row-auto"}`}
          type="submit"
        >
          Search
        </Button>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 sm:flex sm:flex-wrap">
        {showRoomFilter ? (
          <label className="col-span-2 flex min-h-11 items-center gap-2 rounded-md border border-border/70 px-3 text-sm text-foreground">
            <Switch
              aria-label="Show projects in my room only"
              checked={
                !roomFilterUnavailableReason && input.showInRoomOnly !== false
              }
              disabled={!!roomFilterUnavailableReason}
              onCheckedChange={(checked) =>
                navigate({ room: checked ? undefined : "all", page: 1 })
              }
            />
            <span>
              Show in room only
              {roomFilterUnavailableReason ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {roomFilterUnavailableReason}
                </span>
              ) : null}
            </span>
          </label>
        ) : null}
        {showPreviouslyJudgedFilter ? (
          <label className="col-span-2 flex min-h-11 items-center gap-2 rounded-md border border-border/70 px-3 text-sm text-foreground">
            <Switch
              aria-label="See previously judged projects"
              checked={input.includeJudged === true}
              onCheckedChange={(checked) =>
                navigate({ includeJudged: checked ? 1 : undefined, page: 1 })
              }
            />
            See previously judged
          </label>
        ) : null}
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
          Sort
          <select
            aria-label="Sort projects"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
            onChange={(event) =>
              navigate({ page: 1, sort: event.target.value })
            }
            value={input.sort}
          >
            <option value="title">Title</option>
            <option value="submittedAt">Submitted</option>
            <option value="scheduledAt">Judging time</option>
            <option value="participantCount">Team size</option>
            {showChallengeRatingSort ? (
              <option value="challengeRating">Challenge rating</option>
            ) : null}
            {showRatingSort ? <option value="rating">Rating</option> : null}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
          Order
          <select
            aria-label="Sort direction"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
            onChange={(event) =>
              navigate({ direction: event.target.value, page: 1 })
            }
            value={input.direction}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        <label className="ml-auto hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          Rows
          <select
            aria-label="Projects per page"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
            onChange={(event) =>
              navigate({ page: 1, pageSize: event.target.value })
            }
            value={input.pageSize}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function ViewProjectButton<TProject extends Project>({
  onSelect,
  project,
}: {
  onSelect: (project: TProject) => void;
  project: TProject;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={`View ${project.title}`}
          className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
          onClick={() => onSelect(project)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Eye className="size-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">View project details</TooltipContent>
    </Tooltip>
  );
}

function ProjectList<TProject extends Project>({
  actions,
  data,
  emptyDescription,
  extraColumns,
  onSelect,
  showChallenges,
  showViewAction,
}: {
  actions?: (project: TProject) => React.ReactNode;
  data: ProjectDirectoryData<TProject>;
  emptyDescription: string;
  extraColumns?: {
    cell: (project: TProject) => React.ReactNode;
    header: string;
    mobileLabel?: string;
  }[];
  onSelect: (project: TProject) => void;
  showChallenges: boolean;
  showViewAction: boolean;
}) {
  if (data.projects.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-card/70 px-5 py-14 text-center">
        <h2 className="text-lg font-semibold">No projects found</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </section>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b border-border/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                {showChallenges ? (
                  <th className="px-4 py-3 font-medium">Challenges</th>
                ) : null}
                {extraColumns?.map((column) => (
                  <th
                    className="px-4 py-3 text-right font-medium"
                    key={column.header}
                  >
                    {column.header}
                  </th>
                ))}
                {actions ? (
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.projects.map((project) => (
                <tr className="hover:bg-background/40" key={project.id}>
                  <td className="max-w-sm px-4 py-4 align-top">
                    <div className="flex items-start gap-2">
                      {showViewAction ? (
                        <ViewProjectButton
                          onSelect={onSelect}
                          project={project}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <button
                          className="block max-w-full text-left font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => onSelect(project)}
                          type="button"
                        >
                          {project.title}
                        </button>
                        <a
                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          href={project.submissionUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Devpost <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-4 align-top text-muted-foreground">
                    <ul className="space-y-1">
                      {project.members.map((member, index) => (
                        <li key={`${member.name}-${index}`}>{member.name}</li>
                      ))}
                    </ul>
                  </td>
                  {showChallenges ? (
                    <td className="max-w-sm px-4 py-4 align-top">
                      <ProjectBadges project={project} />
                    </td>
                  ) : null}
                  {extraColumns?.map((column) => (
                    <td
                      className="whitespace-nowrap px-4 py-4 text-right align-top font-mono"
                      key={column.header}
                    >
                      {column.cell(project)}
                    </td>
                  ))}
                  {actions ? (
                    <td className="px-4 py-4 text-right align-top">
                      <div className="flex justify-end gap-2">
                        {actions(project)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border/60 md:hidden">
          {data.projects.map((project) => (
            <article className="space-y-3 p-4" key={project.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <button
                    className="min-h-11 min-w-0 break-words text-left text-base font-semibold hover:text-primary"
                    onClick={() => onSelect(project)}
                    type="button"
                  >
                    {project.title}
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Participants:
                </span>{" "}
                {project.members.map((member) => member.name).join(", ")}
              </p>
              {showChallenges ? <ProjectBadges project={project} /> : null}
              {extraColumns?.length ? (
                <dl className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                  {extraColumns.map((column) => (
                    <div className="min-w-0 break-words" key={column.header}>
                      <dt className="text-xs text-muted-foreground">
                        {column.mobileLabel ?? column.header}
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold">
                        {column.cell(project)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="flex items-center gap-2 [&>button]:min-h-11 [&>button]:flex-1">
                <Button
                  asChild
                  className="size-11 shrink-0"
                  size="icon"
                  variant="outline"
                >
                  <a
                    href={project.submissionUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="sr-only">View on Devpost</span>
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(project)}
                >
                  View details
                </Button>
                {actions?.(project)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}

function ProjectPagination({
  data,
  navigate,
  pending,
}: {
  data: ProjectDirectoryData;
  navigate: Navigate;
  pending: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const first = data.totalCount ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = Math.min(data.page * data.pageSize, data.totalCount);
  return (
    <footer className="flex flex-col gap-3 rounded-lg border border-white/10 bg-card/75 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {first}–{last} of {data.totalCount} projects
      </span>
      <div className="flex gap-2">
        <Button
          disabled={data.page <= 1 || pending}
          onClick={() => navigate({ page: Math.max(1, data.page - 1) })}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-1 size-4" /> Previous
        </Button>
        <Button
          disabled={data.page >= pageCount || pending}
          onClick={() => navigate({ page: Math.min(pageCount, data.page + 1) })}
          size="sm"
          variant="outline"
        >
          Next <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </footer>
  );
}

export function ProjectDirectory<TProject extends Project>({
  actions,
  data,
  defaultChallengeLabel = "All challenges",
  emptyDescription = "Try changing the search or filters.",
  extraColumns,
  input,
  lockedChallenge,
  showPrivateDetails = false,
  showChallengeRatingSort = false,
  showChallenges = true,
  showPreviouslyJudgedFilter = false,
  showRoomFilter = false,
  roomFilterUnavailableReason,
  showRatingSort = false,
  showTeamSizeFilters = true,
  showViewAction = false,
}: {
  actions?: (project: TProject) => React.ReactNode;
  data: ProjectDirectoryData<TProject>;
  defaultChallengeLabel?: string;
  emptyDescription?: string;
  extraColumns?: {
    cell: (project: TProject) => React.ReactNode;
    header: string;
    mobileLabel?: string;
  }[];
  input: ProjectDirectoryInput;
  lockedChallenge?: { id: string; label: string };
  showPrivateDetails?: boolean;
  showChallengeRatingSort?: boolean;
  showChallenges?: boolean;
  showPreviouslyJudgedFilter?: boolean;
  showRoomFilter?: boolean;
  roomFilterUnavailableReason?: string;
  showRatingSort?: boolean;
  showTeamSizeFilters?: boolean;
  showViewAction?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<TProject | null>(null);
  const [pending, startTransition] = useTransition();

  function navigate(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if (!showTeamSizeFilters) {
      next.delete("maxParticipants");
      next.delete("minParticipants");
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-4" aria-busy={pending}>
      <ProjectFilters
        challenges={data.challenges}
        defaultChallengeLabel={defaultChallengeLabel}
        input={input}
        lockedChallenge={lockedChallenge}
        key={JSON.stringify(input)}
        navigate={navigate}
        showChallengeRatingSort={showChallengeRatingSort}
        showPreviouslyJudgedFilter={showPreviouslyJudgedFilter}
        showRoomFilter={showRoomFilter}
        roomFilterUnavailableReason={roomFilterUnavailableReason}
        showRatingSort={showRatingSort}
        showTeamSizeFilters={showTeamSizeFilters}
      />
      <ProjectList
        actions={actions}
        data={data}
        emptyDescription={emptyDescription}
        extraColumns={extraColumns}
        onSelect={setSelected}
        showChallenges={showChallenges}
        showViewAction={showViewAction}
      />
      <ProjectPagination data={data} navigate={navigate} pending={pending} />

      <ProjectDetailDialog
        onOpenChange={(open) => !open && setSelected(null)}
        project={selected}
        showPrivateDetails={showPrivateDetails}
      />
    </div>
  );
}
