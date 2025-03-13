"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
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

import { getFormattedDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import SortButton from "../../_components/SortButton";
import { CreateEventButton } from "./create-event";
import { DeleteEventButton } from "./delete-event";
import { EventDetailsButton } from "./event-details";
import { UpdateEventButton } from "./update-event";
import { ViewAttendanceButton } from "./view-attendance-button";

type Event = ReturnEvent;
type SortField = keyof Event;
type SortOrder = "asc" | "desc" | null;

export function EventsTable() {
  const [sortField, setSortField] = useState<SortField | null>(
    "start_datetime",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: events } = api.event.getEvents.useQuery();

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

  const upcomingDate = new Date();
  upcomingDate.setHours(0);
  const upcomingEvents = [...sortedEvents].filter(
    (event) => event.start_datetime >= upcomingDate,
  );

  const previousEvents = [...sortedEvents].filter(
    (event) => event.start_datetime < upcomingDate,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <div className="flex w-full flex-col">
          <div className="flex items-center gap-2 pb-2">
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
          <div className="whitespace-nowrap text-center text-sm font-bold">
            Returned {sortedEvents.length}{" "}
            {sortedEvents.length === 1 ? "event" : "events"}
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">
              <SortButton
                field="name"
                label="Name"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center">
              <SortButton
                field="tag"
                label="Tag"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center">
              <SortButton
                field="start_datetime"
                label="Date"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead>
              <SortButton
                field="location"
                label="Location"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-right">
              <SortButton
                field="numAttended"
                label="Attended"
                sortField={sortField}
                sortOrder={sortOrder}
                setSortField={setSortField}
                setSortOrder={setSortOrder}
              />
            </TableHead>
            <TableHead className="text-center">
              <Label>Event Details</Label>
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
          <TableRow>
            <TableCell
              className="text- bg-muted/50 font-bold sm:text-center"
              colSpan={8}
            >
              Upcoming Events
            </TableCell>
          </TableRow>
          {upcomingEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-center font-medium">
                {event.name}
              </TableCell>
              <TableCell className="text-center">{event.tag}</TableCell>

              <TableCell className="text-center">
                {getFormattedDate(event.start_datetime)}
              </TableCell>

              <TableCell>{event.location}</TableCell>

              <TableCell className="text-right">
                <ViewAttendanceButton
                  event={event}
                  numAttended={event.numAttended}
                />
              </TableCell>

              <TableCell className="text-center">
                <EventDetailsButton event={event} />
              </TableCell>

              <TableCell className="text-center">
                <UpdateEventButton event={event} />
              </TableCell>

              <TableCell className="text-center">
                <DeleteEventButton event={event} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableBody>
          <TableRow>
            <TableCell
              className="bg-muted/50 text-left font-bold sm:text-center"
              colSpan={8}
            >
              Previous Events
            </TableCell>
          </TableRow>
          {previousEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-center font-medium">
                {event.name}
              </TableCell>
              <TableCell className="text-center">{event.tag}</TableCell>

              <TableCell className="text-center">
                {getFormattedDate(event.start_datetime)}
              </TableCell>

              <TableCell>{event.location}</TableCell>

              <TableCell className="text-right">
                <ViewAttendanceButton
                  event={event}
                  numAttended={event.numAttended}
                />
              </TableCell>

              <TableCell className="text-center">
                <EventDetailsButton event={event} />
              </TableCell>

              <TableCell className="text-center">
                <UpdateEventButton event={event} />
              </TableCell>

              <TableCell className="text-center">
                <DeleteEventButton event={event} />
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
            <TableCell colSpan={3} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
