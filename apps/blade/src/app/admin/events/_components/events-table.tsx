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
import { CreateEventButton } from "./create-event";

interface Event {
  name: string;
  tag: string;
  date: string;
  location: string;
  attended: number;
}

const events: Event[] = [
  {
    name: "Fall Kickoff",
    tag: "GBM",
    date: "2024-08-21",
    location: "ENG Atrium",
    attended: 100,
  },
  {
    name: "Hackathon 101",
    tag: "GBM",
    date: "2024-09-21",
    location: "ENG Atrium",
    attended: 120,
  },
  {
    name: "Goodbye Bash",
    tag: "GBM",
    date: "2024-01-21",
    location: "ENG Atrium",
    attended: 130,
  },
  {
    name: "Geico",
    tag: "Sponosrship",
    date: "2024-08-21",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Chase",
    tag: "Sponsorship",
    date: "2024-08-28",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Linux",
    tag: "Hello World",
    date: "2024-09-23",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Obsidian",
    tag: "Hello World",
    date: "2024-10-15",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Python",
    tag: "Tech Exploration",
    date: "2024-08-28",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Welcome Social",
    tag: "Social",
    date: "2024-08-10",
    location: "ENG Atrium",
    attended: 110,
  },
  {
    name: "Java Basics",
    tag: "Tech Exploration",
    date: "2024-09-05",
    location: "HEC 101",
    attended: 80,
  },
  {
    name: "React Workshop",
    tag: "Tech Exploration",
    date: "2024-08-20",
    location: "HEC 101",
    attended: 95,
  },
  {
    name: "Midterm Stress Buster",
    tag: "Social",
    date: "2024-10-07",
    location: "ENG Atrium",
    attended: 100,
  },
  {
    name: "Google Cloud Basics",
    tag: "Tech Exploration",
    date: "2024-08-15",
    location: "HEC 101",
    attended: 90,
  },
  {
    name: "Intro to Docker",
    tag: "Hello World",
    date: "2024-11-02",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Halloween Bash",
    tag: "Social",
    date: "2024-10-30",
    location: "ENG Atrium",
    attended: 120,
  },
  {
    name: "End-of-Semester Social",
    tag: "Social",
    date: "2024-12-15",
    location: "ENG Atrium",
    attended: 105,
  },
  {
    name: "Microsoft Azure Workshop",
    tag: "Sponsorship",
    date: "2024-09-17",
    location: "HEC 101",
    attended: 80,
  },
  {
    name: "Data Structures Support",
    tag: "Class Support",
    date: "2024-11-12",
    location: "HEC 101",
    attended: 65,
  },
  {
    name: "Cybersecurity Basics",
    tag: "Tech Exploration",
    date: "2024-08-24",
    location: "HEC 101",
    attended: 85,
  },
  {
    name: "LinkedIn Workshop",
    tag: "Sponsorship",
    date: "2024-10-20",
    location: "HEC 101",
    attended: 95,
  },
  {
    name: "AI in Gaming",
    tag: "Tech Exploration",
    date: "2024-09-10",
    location: "HEC 101",
    attended: 100,
  },
  {
    name: "Study Night",
    tag: "Class Support",
    date: "2024-12-05",
    location: "ENG Atrium",
    attended: 70,
  },
  {
    name: "Networking Tips",
    tag: "Social",
    date: "2024-11-22",
    location: "HEC 101",
    attended: 85,
  },
  {
    name: "GCP Certification Info",
    tag: "Sponsorship",
    date: "2024-08-18",
    location: "HEC 101",
    attended: 90,
  },
  {
    name: "Intro to Kubernetes",
    tag: "Hello World",
    date: "2024-11-05",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Unity Basics",
    tag: "Tech Exploration",
    date: "2024-09-27",
    location: "HEC 101",
    attended: 85,
  },
  {
    name: "Advanced Git Techniques",
    tag: "Hello World",
    date: "2024-08-30",
    location: "HEC 101",
    attended: 75,
  },
  {
    name: "Finals Chill Night",
    tag: "Social",
    date: "2024-12-21",
    location: "ENG Atrium",
    attended: 110,
  },
];

type SortField = keyof Event;
type SortOrder = "asc" | "desc" | null;

export function EventsTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvents = events.filter((event) =>
    Object.values(event).some((value: string | number) =>
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
              <SortButton field="date" label="Date" />
            </TableHead>
            <TableHead>
              <SortButton field="location" label="Location" />
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="attended" label="Attended" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.map((event) => (
            <TableRow key={event.name}>
              <TableCell className="font-medium">{event.name}</TableCell>
              <TableCell>{event.tag}</TableCell>
              <TableCell>{event.date}</TableCell>
              <TableCell>{event.location}</TableCell>
              <TableCell className="text-right">{event.attended}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Attendance</TableCell>
            <TableCell className="text-right">
              {sortedEvents.reduce((sum, event) => sum + event.attended, 0)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
