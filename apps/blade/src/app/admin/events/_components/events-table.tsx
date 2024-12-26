"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import { api } from "~/trpc/react";
import { CreateEventButton } from "./create-event";

interface Event {
  name: string;
  tag: string;
  datetime: Date;
  location: string;
  numAttended: number;
}

type SortField = keyof Event;
type SortOrder = "asc" | "desc" | null;

export function EventsTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: events } = api.event.getEvents.useQuery();
  console.log(events);

  const filteredEvents = (events ?? []).filter((event) =>
    Object.values(event).some(
      (value) =>
        value !== null &&
        (typeof value === "string" || typeof value === "number") &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (!sortField || sortOrder === null) return 0;
    if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(
        sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc",
      );
      if (sortOrder === "desc") setSortField(null);
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortButton = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let Icon = ArrowUpDown;
    if (sortField === field) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Icon =
        sortOrder === "asc"
          ? ArrowUp
          : sortOrder === "desc"
            ? ArrowDown
            : ArrowUpDown;
    }

    return (
      <Button
        variant="ghost"
        onClick={() => toggleSort(field)}
        className="h-8 px-2 lg:px-3"
      >
        {label}
        <Icon className="ml-2 h-4 w-4" />
      </Button>
    );
  };

  return (
    // Display a loader while the events are being fetched

    <div>
      <div className="flex items-center justify-between gap-10 border-b pb-4">
        <div className="relative w-full">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <CreateEventButton />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">
              <SortButton field="name" label="Name" />
            </TableHead>
            <TableHead>
              <SortButton field="tag" label="Tag" />
            </TableHead>
            <TableHead>
              <SortButton field="datetime" label="Date" />
            </TableHead>
            <TableHead>
              <SortButton field="location" label="Location" />
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="numAttended" label="Attended" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.map((event) => (
            <TableRow key={event.name}>
              <TableCell className="font-medium">{event.name}</TableCell>
              <TableCell>{event.tag}</TableCell>
              <TableCell>{event.datetime.toDateString()}</TableCell>
              <TableCell>{event.location}</TableCell>
              <TableCell className="text-right">{event.numAttended}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Attendance</TableCell>
            <TableCell className="text-right">
              {sortedEvents.reduce(
                (sum, event) => sum + (event as Event).numAttended,
                0,
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
