"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Clock, Search } from "lucide-react";

import type { InsertMember, Member } from "@forge/db/schemas/knight-hacks";
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

import { api } from "~/trpc/react";
import SortButton from "../../_components/SortButton";
import ClearDuesButton from "./clear-dues";
import DeleteMemberButton from "./delete-member";
import DuesToggleButton from "./dues-toggle";
import MemberProfileButton from "./member-profile";
import UpdateMemberButton from "./update-member";

type Member = InsertMember;
type SortField = keyof Member;
type SortOrder = "asc" | "desc" | null;
type TimeOrder = "asc" | "desc";
type ActiveOrder = "time" | "field";

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

export default function MemberTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeSortOrder, setTimeSortOrder] = useState<TimeOrder>("asc");
  const [activeSort, setActiveSort] = useState<ActiveOrder>("field");

  const { data: members } = api.member.getMembers.useQuery();
  const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();
  const duesMap = new Map();

  for (const status of duesPayingStatus ?? []) {
    duesMap.set(status.id, true);
  }

  const filteredMembers = (members ?? []).filter((member) =>
    Object.values(member).some((value) => {
      if (value === null) return false;
      return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }),
  );

  const sortedMembers = [...filteredMembers].sort((a, b) => {
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
      <div className="flex items-center justify-between gap-2 border-b pb-4">
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
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div>
          <ClearDuesButton />
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
              <Label>Dues Paying?</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Dues Toggle</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Member Profile</Label>
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
          {sortedMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="text-center font-medium">
                {member.firstName}
              </TableCell>
              <TableCell className="text-center font-medium">
                {member.lastName}
              </TableCell>
              <TableCell className="text-center font-medium">
                {member.discordUser}
              </TableCell>
              <TableCell className="font-medium">{member.email}</TableCell>
              <TableCell className="text-center font-medium">
                {duesMap.has(member.id) ? "Yes" : "No"}
              </TableCell>
              <TableCell className="text-center">
                <DuesToggleButton
                  member={member}
                  status={duesMap.has(member.id)}
                />
              </TableCell>
              <TableCell className="text-center">
                <MemberProfileButton member={member} />
              </TableCell>
              <TableCell className="text-center">
                <UpdateMemberButton member={member} />
              </TableCell>
              <TableCell className="text-center">
                <DeleteMemberButton member={member} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
