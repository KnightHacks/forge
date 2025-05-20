"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Clock, Search } from "lucide-react";

import type { Hacker, InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
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

import SortButton from "~/app/admin/_components/SortButton";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import DeleteHackerButton from "./delete-hacker";
import HackerProfileButton from "./hacker-profile";
import HackerStatusToggle from "./hacker-status-toggle";
import HackerSurveyResponsesButton from "./hacker-survey-responses";
import UpdateHackerButton from "./update-hacker";

function parseDate(datePart: string, timePart: string): Date {
  const date = new Date(datePart);
  const [hours, minutes, seconds, microseconds] = timePart
    .split(/[:.]/)
    .map(Number);

  date.setUTCHours(
    hours ?? 0,
    minutes ?? 0,
    seconds ?? 0,
    Math.floor((microseconds ?? 0) / 1000),
  );

  return date;
}

type Hacker = InsertHacker;
type SortField = keyof Hacker;
type SortOrder = "asc" | "desc" | null;
type TimeOrder = "asc" | "desc";
type ActiveOrder = "time" | "field";

export default function HackerTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeSortOrder, setTimeSortOrder] = useState<TimeOrder>("asc");
  const [activeSort, setActiveSort] = useState<ActiveOrder>("field");

  const { data: hackers } = api.hacker.getAllHackers.useQuery();

  const filteredHackers = (hackers ?? []).filter((hacker) =>
    Object.values(hacker).some((value) => {
      if (value === null) return false;
      return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }),
  );

  const sortedHackers = [...filteredHackers].sort((a, b) => {
    const dateA = parseDate(a.dateCreated, a.timeCreated);
    const dateB = parseDate(b.dateCreated, b.timeCreated);

    if (activeSort == "time") {
      if (dateA < dateB) return timeSortOrder === "asc" ? -1 : 1;
      if (dateA > dateB) return timeSortOrder === "asc" ? 1 : -1;
    } else {
      if (!sortField || sortOrder === null) return 0;
      if (a[sortField] == null || b[sortField] == null) return 0;
      if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
    }

    return 0;
  });
  const toggleTimeSort = () => {
    setTimeSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setActiveSort("time");
  };

  const toggleFieldSort = () => {
    setActiveSort("field");
  };
  return (
    <div>
      <div className="flex flex-col border-b pb-2">
        <div className="flex items-center gap-2 pb-2">
          <div>
            <Button className="flex flex-row gap-1" onClick={toggleTimeSort}>
              <Clock />
              {timeSortOrder === "asc" && <ArrowUp />}
              {timeSortOrder === "desc" && <ArrowDown />}
            </Button>
          </div>
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
          Returned {sortedHackers.length}{" "}
          {sortedHackers.length === 1 ? "hacker" : "hackers"}
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
          {sortedHackers.map((hacker) => (
            <TableRow>
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
                className={`break-keep text-center font-bold ${HACKER_STATUS_MAP[hacker.status].color}`}
              >
                {HACKER_STATUS_MAP[hacker.status].name}
              </TableCell>
              <TableCell>
                <HackerStatusToggle hacker={hacker} />
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
                <DeleteHackerButton hacker={hacker} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
