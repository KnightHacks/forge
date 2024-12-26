"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import type { InsertEvent } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
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
import { UpdateEventButton } from "./update-event";

type Event = InsertEvent;
type SortField = keyof Event;
type SortOrder = "asc" | "desc" | null;

export function EventsTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 3) The TRPC query should return an array of Event
  //    e.g., your procedure might do: return db.select().from(Event)....
  //    plus "numAttended" if you have a join or subquery
  const { data: events } = api.event.getEvents.useQuery();

  console.log(events);

  // 4) Filter & sort logic stays the same, but we rely on Event
  const filteredEvents = (events ?? []).filter((event) =>
    Object.values(event).some((value) => {
      if (value === null) return false;
      // Convert value to string for searching
      return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }),
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (!sortField || sortOrder === null) return 0;
    if (a[sortField] == null || b[sortField] == null) return 0;
    if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // 5) Sorting toggler
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

  // 6) A small helper to display the correct sort icon
  const SortButton = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => {
    let Icon = ArrowUpDown;
    if (sortField === field) {
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
            <TableHead>
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
            <TableHead className="text-right">
              <Label>Update</Label>
            </TableHead>
            <TableHead className="text-right">
              <Label>Delete</Label>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.name}</TableCell>
              <TableCell>{event.tag}</TableCell>

              <TableCell>
                {typeof event.datetime === "string"
                  ? new Date(event.datetime).toDateString()
                  : event.datetime.toDateString()}
              </TableCell>

              <TableCell>{event.location}</TableCell>

              <TableCell className="text-right">{event.numAttended}</TableCell>

              <TableCell className="text-right">
                {/* Pass the full event object (including id) to UpdateEventButton */}
                <UpdateEventButton event={event} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Attendance</TableCell>
            <TableCell className="text-right">
              {sortedEvents.reduce((sum, event) => sum + event.numAttended, 0)}
            </TableCell>
            <TableCell colSpan={2}/>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
