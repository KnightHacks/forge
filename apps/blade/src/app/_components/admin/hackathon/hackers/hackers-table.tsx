"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Search } from "lucide-react";

import type { InsertHackathon } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
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

  const { data: hackathons } = api.hackathon.getHackathons.useQuery();
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
      <div className="mb-4 mt-6 flex flex-col justify-between gap-4 md:flex-row-reverse lg:flex-row-reverse">
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
          <SelectTrigger
            className="md:w-1/2 lg:w-1/2"
            aria-label="Select a hackathon"
          >
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
        <h2 className="text-2xl font-bold">
          {activeHackathon?.name ?? "All Hackers"}
        </h2>
      </div>

      <div className="flex flex-col border-b pb-2">
        <div className="flex items-center gap-2 pb-2">
          <div>
            <Button className="flex flex-row gap-1" onClick={toggleTimeSort}>
              <Clock />
              {timeSortOrder === "asc" && <ArrowUp />}
              {timeSortOrder === "desc" && <ArrowDown />}
            </Button>
          </div>
          <CustomPaginationSelect
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hackers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="whitespace-nowrap text-center text-sm font-bold">
          Returned {totalCount} {totalCount === 1 ? "hacker" : "hackers"}
        </div>
      </div>

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
            <TableHead className="text-center">
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
            <TableHead>
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
            <TableHead className="text-center">
              <Label>Status</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Status Toggle</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Hacker Profile</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Survey Responses</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Update</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Delete</Label>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hackersWithBlacklist.map((hacker) => (
            <TableRow key={hacker.id}>
              <TableCell className="text-center font-medium">
                {hacker.firstName}
              </TableCell>
              <TableCell className="text-center font-medium">
                {hacker.lastName}
              </TableCell>
              <TableCell className="text-center font-medium">
                {hacker.discordUser}
              </TableCell>
              <TableCell className="font-medium">{hacker.email}</TableCell>
              <TableCell
                className={`break-keep text-center font-bold ${HACKER_STATUS_MAP[hacker.status as keyof typeof HACKER_STATUS_MAP].color}`}
              >
                {
                  HACKER_STATUS_MAP[
                    hacker.status as keyof typeof HACKER_STATUS_MAP
                  ].name
                }
              </TableCell>
              <TableCell>
                <HackerStatusToggle
                  hacker={hacker}
                  hackathonName={activeHackathon?.displayName ?? ""}
                />
              </TableCell>
              <TableCell className="text-center">
                <HackerProfileButton hacker={hacker} />
              </TableCell>
              <TableCell className="text-center">
                <HackerSurveyResponsesButton hacker={hacker} />
              </TableCell>
              <TableCell className="text-center">
                <UpdateHackerButton hacker={hacker} />
              </TableCell>
              <TableCell className="text-center">
                <DeleteHackerButton
                  hacker={hacker}
                  hackathonName={activeHackathon?.displayName ?? ""}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CustomPagination
        className="mt-4"
        itemCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
      />
    </div>
  );
}
