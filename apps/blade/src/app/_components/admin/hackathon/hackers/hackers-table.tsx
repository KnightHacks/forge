"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Search } from "lucide-react";

import type { InsertHackathon } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
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

import SortButton from "~/app/_components/shared/SortButton";
import { useDebounce } from "~/app/admin/_hooks/debounce";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import CustomPagination from "../../charts/CustomPagination";
import CustomPaginationSelect from "../../charts/CustomPaginationSelect";
import DeleteHackerButton from "./delete-hacker";
import HackerProfileButton from "./hacker-profile";
import HackerStatusToggle from "./hacker-status-toggle";
import HackerSurveyResponsesButton from "./hacker-survey-responses";
import UpdateHackerButton from "./update-hacker";

type SortField =
  | "firstName"
  | "lastName"
  | "email"
  | "discordUser"
  | "dateCreated";
type SortOrder = "asc" | "desc" | null;
type TimeOrder = "asc" | "desc";
type HackerStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "denied"
  | "waitlisted"
  | "withdrawn";

const HACKER_STATUSES: readonly HackerStatus[] = [
  "pending",
  "accepted",
  "confirmed",
  "withdrawn",
  "denied",
  "waitlisted",
] as const;

type FilterOption = {
  value: string;
  label: string;
};

export default function HackerTable({
  filterStatus,
}: {
  filterStatus: string | null;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [sortByTime, setSortByTime] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeSortOrder, setTimeSortOrder] = useState<TimeOrder>("asc");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [raceFilter, setRaceFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradYearFilter, setGradYearFilter] = useState<number | undefined>();
  const [isFirstTimeFilter, setIsFirstTimeFilter] = useState<
    "all" | "yes" | "no"
  >("all");
  const [activeHackathon, setActiveHackathon] =
    useState<InsertHackathon | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isFirstRender = useRef(true);
  const stableRefs = useRef({ currentPage, searchParams, router });
  const statusFilter: HackerStatus | undefined =
    filterStatus && HACKER_STATUSES.includes(filterStatus as HackerStatus)
      ? (filterStatus as HackerStatus)
      : undefined;
  const parsedIsFirstTimeFilter =
    isFirstTimeFilter === "all" ? undefined : isFirstTimeFilter === "yes";

  const { data: hackathons } = api.hackathon.getHackathons.useQuery();
  const filterOptionsQuery =
    api.hackerPagination.getHackerFilterOptions.useQuery(
      { hackathonId: activeHackathon?.id ?? "" },
      {
        enabled: !!activeHackathon?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 30_000,
      },
    );
  const hackersQuery = api.hackerPagination.getHackersPage.useQuery(
    {
      hackathonId: activeHackathon?.id ?? "",
      currentPage,
      pageSize,
      searchTerm: debouncedSearchTerm,
      sortField: sortByTime ? undefined : (sortField ?? undefined),
      sortOrder: (sortByTime ? timeSortOrder : sortOrder) ?? "asc",
      sortByTime,
      statusFilter,
      schoolFilter: schoolFilter || undefined,
      majorFilter: majorFilter || undefined,
      raceFilter: raceFilter || undefined,
      genderFilter: genderFilter || undefined,
      gradYearFilter,
      isFirstTimeFilter: parsedIsFirstTimeFilter,
    },
    {
      enabled: !!activeHackathon?.id,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 30_000,
    },
  );

  const hackerCountQuery = api.hackerPagination.getHackerCount.useQuery(
    {
      hackathonId: activeHackathon?.id ?? "",
      searchTerm: debouncedSearchTerm,
      statusFilter,
      schoolFilter: schoolFilter || undefined,
      majorFilter: majorFilter || undefined,
      raceFilter: raceFilter || undefined,
      genderFilter: genderFilter || undefined,
      gradYearFilter,
      isFirstTimeFilter: parsedIsFirstTimeFilter,
    },
    {
      enabled: !!activeHackathon?.id,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 30_000,
    },
  );

  const hackers = hackersQuery.data ?? [];
  const totalCount = hackerCountQuery.data ?? 0;
  const filterOptions = filterOptionsQuery.data ?? {
    schools: [],
    majors: [],
    races: [],
    genders: [],
    gradYears: [],
    hackerTypeCounts: {
      firstTime: 0,
      returning: 0,
    },
  };
  const schoolOptions: FilterOption[] = [
    { value: "", label: "All Schools" },
    ...filterOptions.schools.map((s) => ({
      value: s.value,
      label: `${s.value} (${s.count})`,
    })),
  ];
  const majorOptions: FilterOption[] = [
    { value: "", label: "All Majors" },
    ...filterOptions.majors.map((m) => ({
      value: m.value,
      label: `${m.value} (${m.count})`,
    })),
  ];
  const raceOptions: FilterOption[] = [
    { value: "", label: "All Races" },
    ...filterOptions.races.map((r) => ({
      value: r.value,
      label: `${r.value} (${r.count})`,
    })),
  ];
  const genderOptions: FilterOption[] = [
    { value: "", label: "All Genders" },
    ...filterOptions.genders.map((g) => ({
      value: g.value,
      label: `${g.value} (${g.count})`,
    })),
  ];
  const gradYearOptions: FilterOption[] = [
    { value: "", label: "All Grad Years" },
    ...filterOptions.gradYears.map((y) => ({
      value: y.value.toString(),
      label: `${y.value} (${y.count})`,
    })),
  ];
  const firstTimeOptions: FilterOption[] = [
    { value: "all", label: "All Hackers" },
    {
      value: "yes",
      label: `First Time (${filterOptions.hackerTypeCounts.firstTime})`,
    },
    {
      value: "no",
      label: `Returning (${filterOptions.hackerTypeCounts.returning})`,
    },
  ];

  // Default to the closest hackathon that hasn't passed
  useEffect(() => {
    if (!activeHackathon && hackathons?.length) {
      const now = new Date();
      const upcomingHackathons = hackathons.filter(
        (h) => new Date(h.endDate) > now,
      );
      const closestHackathon = upcomingHackathons.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )[0];

      setActiveHackathon(closestHackathon ?? hackathons[0] ?? null);
    }
  }, [hackathons, activeHackathon]);

  useEffect(() => {
    stableRefs.current = { currentPage, searchParams, router };
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (stableRefs.current.currentPage !== 1) {
      const params = new URLSearchParams(stableRefs.current.searchParams);
      params.set("page", "1");
      stableRefs.current.router.replace("?" + params.toString());
    }
  }, [
    debouncedSearchTerm,
    statusFilter,
    pageSize,
    activeHackathon?.id,
    schoolFilter,
    majorFilter,
    raceFilter,
    genderFilter,
    gradYearFilter,
    isFirstTimeFilter,
  ]);

  // Apply soft blacklist transformation BEFORE filtering
  const hackersWithBlacklist = hackers.map((hacker) =>
    hacker.id === "7f89fe4d-26f0-42fe-ac98-22d8f648d7a7"
      ? { ...hacker, status: "denied" }
      : hacker,
  );

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    router.replace("?" + params.toString());
  };

  const toggleTimeSort = () => {
    setTimeSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setSortByTime(true);
    setSortField(null);
    setSortOrder(null);
  };

  const toggleFieldSort = () => {
    setSortByTime(false);
  };

  return (
    <div>
      <div className="mb-4 mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">
          {activeHackathon?.name ?? "All Hackers"}
        </h2>
        <div className="w-full md:ml-auto md:w-auto md:min-w-[220px]">
          <Select
            value={activeHackathon?.name ?? undefined}
            onValueChange={(name) => {
              const selectedHackathon =
                hackathons?.find((h) => h.name === name) ?? null;
              setActiveHackathon(selectedHackathon);
              const params = new URLSearchParams(searchParams);
              params.set("page", "1");
              router.replace("?" + params.toString());
            }}
          >
            <SelectTrigger className="w-full" aria-label="Select a hackathon">
              <SelectValue placeholder="Select a hackathon..." />
            </SelectTrigger>
            <SelectContent>
              {hackathons?.map((hackathon) => (
                <SelectItem key={hackathon.id} value={hackathon.name}>
                  {hackathon.name}
                  <span className="me-2" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col border-b pb-3">
        <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Button className="flex flex-row gap-1" onClick={toggleTimeSort}>
              <Clock />
              {timeSortOrder === "asc" && <ArrowUp />}
              {timeSortOrder === "desc" && <ArrowDown />}
            </Button>
            <CustomPaginationSelect
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
          <div className="relative w-full sm:min-w-[150px] sm:flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hackers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-2 md:flex md:flex-nowrap md:justify-center md:gap-2">
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={schoolOptions}
                renderItem={(school) => <span>{school.label}</span>}
                getItemValue={(school) => school.value}
                getItemLabel={(school) => school.label}
                onItemSelect={(school) => {
                  setSchoolFilter(school.value);
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Schools"
                inputPlaceholder="Search schools..."
              />
            </div>
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={majorOptions}
                renderItem={(major) => <span>{major.label}</span>}
                getItemValue={(major) => major.value}
                getItemLabel={(major) => major.label}
                onItemSelect={(major) => {
                  setMajorFilter(major.value);
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Majors"
                inputPlaceholder="Search majors..."
              />
            </div>
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={raceOptions}
                renderItem={(race) => <span>{race.label}</span>}
                getItemValue={(race) => race.value}
                getItemLabel={(race) => race.label}
                onItemSelect={(race) => {
                  setRaceFilter(race.value);
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Races"
                inputPlaceholder="Search races..."
              />
            </div>
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={genderOptions}
                renderItem={(gender) => <span>{gender.label}</span>}
                getItemValue={(gender) => gender.value}
                getItemLabel={(gender) => gender.label}
                onItemSelect={(gender) => {
                  setGenderFilter(gender.value);
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Genders"
                inputPlaceholder="Search genders..."
              />
            </div>
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={gradYearOptions}
                renderItem={(year) => <span>{year.label}</span>}
                getItemValue={(year) => year.value}
                getItemLabel={(year) => year.label}
                onItemSelect={(year) => {
                  setGradYearFilter(
                    year.value === "" ? undefined : Number(year.value),
                  );
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Grad Years"
                inputPlaceholder="Search grad years..."
              />
            </div>
            <div className="w-full md:w-[170px]">
              <ResponsiveComboBox
                items={firstTimeOptions}
                renderItem={(type) => <span>{type.label}</span>}
                getItemValue={(type) => type.value}
                getItemLabel={(type) => type.label}
                onItemSelect={(type) => {
                  setIsFirstTimeFilter(type.value as "all" | "yes" | "no");
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.replace("?" + params.toString());
                }}
                buttonPlaceholder="All Hackers"
                inputPlaceholder="Select type..."
              />
            </div>
          </div>
        </div>
        <div className="whitespace-nowrap text-center text-sm font-bold">
          Returned {totalCount} {totalCount === 1 ? "hacker" : "hackers"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">
                <SortButton
                  field="firstName"
                  label="First Name"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  setSortField={setSortField}
                  setSortOrder={setSortOrder}
                  setActiveSort={toggleFieldSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortButton
                  field="lastName"
                  label="Last Name"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  setSortField={setSortField}
                  setSortOrder={setSortOrder}
                  setActiveSort={toggleFieldSort}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton
                  field="discordUser"
                  label="Discord"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  setSortField={setSortField}
                  setSortOrder={setSortOrder}
                  setActiveSort={toggleFieldSort}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton
                  field="email"
                  label="Email"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  setSortField={setSortField}
                  setSortOrder={setSortOrder}
                  setActiveSort={toggleFieldSort}
                />
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Status</Label>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Status Toggle</Label>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Hacker Profile</Label>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Survey Responses</Label>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Update</Label>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <Label>Delete</Label>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hackersQuery.isLoading || hackerCountQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center">
                  Loading Hackers ...
                </TableCell>
              </TableRow>
            ) : hackersQuery.error || hackerCountQuery.error ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center">
                  Failed to load hackers!
                </TableCell>
              </TableRow>
            ) : (
              hackersWithBlacklist.map((hacker) => (
                <TableRow key={hacker.id}>
                  <TableCell className="text-center font-medium">
                    {hacker.firstName}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {hacker.lastName}
                  </TableCell>
                  <TableCell className="hidden text-center font-medium md:table-cell">
                    {hacker.discordUser}
                  </TableCell>
                  <TableCell className="hidden font-medium md:table-cell">
                    {hacker.email}
                  </TableCell>
                  <TableCell
                    className={`hidden break-keep text-center font-bold md:table-cell ${HACKER_STATUS_MAP[hacker.status as keyof typeof HACKER_STATUS_MAP].color}`}
                  >
                    {
                      HACKER_STATUS_MAP[
                        hacker.status as keyof typeof HACKER_STATUS_MAP
                      ].name
                    }
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <HackerStatusToggle
                      hacker={hacker}
                      hackathonName={activeHackathon?.displayName ?? ""}
                    />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HackerProfileButton hacker={hacker} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HackerSurveyResponsesButton hacker={hacker} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <UpdateHackerButton hacker={hacker} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <DeleteHackerButton
                      hacker={hacker}
                      hackathonName={activeHackathon?.displayName ?? ""}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CustomPagination
        className="mt-4"
        itemCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
      />
    </div>
  );
}
