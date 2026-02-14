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

import SortButton from "~/app/_components/shared/SortButton";
import { getFormattedDate } from "~/lib/utils";
import { api } from "~/trpc/react";
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
  const { data: hackathons } = api.hackathon.getHackathons.useQuery();

  // Only show hackathon events (events with hackathonId)
  const hackathonEvents = (events ?? []).filter((event) => event.hackathonId);

  const filteredEvents = hackathonEvents.filter((event) =>
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

  const now = new Date();
  const upcomingEvents = [...sortedEvents].filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent >= now;
  });

  const previousEvents = [...sortedEvents].filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent < now;
  });

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
            <TableHead className="text-right">
              <SortButton
                field="points"
                label="Points"
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
              colSpan={9}
            >
              Upcoming Events
            </TableCell>
          </TableRow>
          {upcomingEvents.map((event) => {
            const hackathonName = hackathons?.find((v) => {
              return v.id == event.hackathonId;
            })?.name;
            return (
              <TableRow key={event.id}>
                <TableCell className="text-center font-medium">
                  {event.name}
                </TableCell>
                <TableCell className="text-center">
                  {event.tag + (hackathonName ? ` [${hackathonName}]` : "")}
                </TableCell>

                <TableCell className="text-center">
                  {getFormattedDate(event.start_datetime)}
                </TableCell>

                <TableCell>{event.location}</TableCell>

                <TableCell className="text-right">
                  <ViewAttendanceButton
                    event={event}
                    numAttended={event.numHackerAttended}
                  />
                </TableCell>

                <TableCell className="text-right">
                  {event.points ?? 0}
                </TableCell>

                <TableCell className="text-center">
                  <EventDetailsButton
                    event={{ ...event, hackathonName: hackathonName }}
                  />
                </TableCell>

                <TableCell className="text-center">
                  <UpdateEventButton event={event} />
                </TableCell>

                <TableCell className="text-center">
                  <DeleteEventButton event={event} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        <TableBody>
          <TableRow>
            <TableCell
              className="bg-muted/50 text-left font-bold sm:text-center"
              colSpan={9}
            >
              Previous Events
            </TableCell>
          </TableRow>
          {previousEvents.map((event) => {
            const hackathonName = hackathons?.find((v) => {
              return v.id == event.hackathonId;
            })?.name;
            return (
              <TableRow key={event.id}>
                <TableCell className="text-center font-medium">
                  {event.name}
                </TableCell>
                <TableCell className="text-center">
                  {event.tag + (hackathonName ? ` [${hackathonName}]` : "")}
                </TableCell>

                <TableCell className="text-center">
                  {getFormattedDate(event.start_datetime)}
                </TableCell>

                <TableCell>{event.location}</TableCell>

                <TableCell className="text-right">
                  <ViewAttendanceButton
                    event={event}
                    numAttended={event.numHackerAttended}
                  />
                </TableCell>

                <TableCell className="text-right">
                  {event.points ?? 0}
                </TableCell>

                <TableCell className="text-center">
                  <EventDetailsButton
                    event={{ ...event, hackathonName: hackathonName }}
                  />
                </TableCell>

                <TableCell className="text-center">
                  <UpdateEventButton event={event} />
                </TableCell>

                <TableCell className="text-center">
                  <DeleteEventButton event={event} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Attendance</TableCell>
            <TableCell className="text-right">
              {sortedEvents.reduce(
                (sum, event) => sum + event.numHackerAttended,
                0,
              )}
            </TableCell>
            <TableCell className="text-right">
              {sortedEvents.reduce(
                (sum, event) => sum + (event.points ?? 0),
                0,
              )}
            </TableCell>
            <TableCell colSpan={3} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
