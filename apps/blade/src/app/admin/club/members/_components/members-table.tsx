"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Search } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import CustomPagination from "~/app/admin/_components/CustomPagination";
import CustomPaginationSelect from "~/app/admin/_components/CustomPaginationSelect";
import SortButton from "~/app/admin/_components/SortButton";
import { useDebounce } from "~/app/admin/_hooks/debounce";
import { api } from "~/trpc/react";
import ClearDuesButton from "./clear-dues";
import DeleteMemberButton from "./delete-member";
import DuesToggleButton from "./dues-toggle";
import MemberProfileButton from "./member-profile";
import UpdateMemberButton from "./update-member";

// We dont need to sort through so many different fields
type SortField =
  | "firstName"
  | "lastName"
  | "email"
  | "discordUser"
  | "dateCreated";
type SortOrder = "asc" | "desc" | null;

export default function MemberTable() {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortByTime, setSortByTime] = useState<boolean>(false);
  const [timeSortOrder, setTimeSortOrder] = useState<"asc" | "desc">("asc");
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [majorFilter, setMajorFilter] = useState<string>("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const debounceSearchTerm = useDebounce(searchTerm, 250);

  const membersQuery = api.member.getMembers.useQuery({
    currentPage,
    pageSize,
    searchTerm: debounceSearchTerm,
    sortField: sortByTime ? undefined : (sortField ?? undefined),
    sortOrder: sortByTime ? timeSortOrder : (sortOrder ?? undefined),
    sortByTime,
    schoolFilter,
    majorFilter,
  });
  const totalCountQuery = api.member.getMemberCount.useQuery({
    searchTerm: debounceSearchTerm,
    schoolFilter,
    majorFilter,
  });
  const duesQuery = api.member.getDuesPayingMembers.useQuery();
  const schoolsQuery = api.member.getDistinctSchools.useQuery();
  const majorsQuery = api.member.getDistinctMajors.useQuery();

  const isLoading =
    membersQuery.isLoading ||
    totalCountQuery.isLoading ||
    duesQuery.isLoading ||
    schoolsQuery.isLoading ||
    majorsQuery.isLoading;

  const hasError =
    membersQuery.error ||
    totalCountQuery.error ||
    duesQuery.error ||
    schoolsQuery.error ||
    majorsQuery.error;

  // Include Skeletons for future ticket
  if (isLoading) return <div>Loading members...</div>;
  if (hasError) return <div>Failed to load members.</div>;

  const members = membersQuery.data ?? [];
  const totalCount = totalCountQuery.data ?? 0;
  const duesPayingStatus = duesQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const majors = majorsQuery.data ?? [];

  const duesMap = new Map();

  for (const status of duesPayingStatus) {
    duesMap.set(status.id, true);
  }

  const toggleTimeSort = () => {
    setTimeSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setSortByTime(true);
    setSortField(null);
    setSortOrder(null);
  };

  const handleSortField = () => {
    setSortByTime(false);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);

    // We need to reset the page back to 1 when changing member viewing size
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    router.push("?" + params.toString());
  };

  return (
    <div>
      <div className="border-b pb-2">
        <div className="flex items-center gap-2 pb-2">
          <div>
            <Button className="flex flex-row gap-1" onClick={toggleTimeSort}>
              <Clock />
              {timeSortOrder === "asc" && <ArrowUp />}
              {timeSortOrder === "desc" && <ArrowDown />}
            </Button>
          </div>
          <div>
            <CustomPaginationSelect
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (currentPage !== 1) {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", "1");
                  router.push("?" + params.toString());
                }
              }}
              className="pl-8"
            />
          </div>
          <div>
            <ResponsiveComboBox
              items={["All Schools", ...schools]}
              renderItem={(school) => <span>{school}</span>}
              getItemValue={(school) => school}
              getItemLabel={(school) => school}
              onItemSelect={(school) => {
                setSchoolFilter(school === "All Schools" ? "" : school);
                const params = new URLSearchParams(searchParams);
                params.set("page", "1");
                router.push("?" + params.toString());
              }}
              buttonPlaceholder="All Schools"
              inputPlaceholder="Search schools..."
            />
          </div>
          <div>
            <ResponsiveComboBox
              items={["All Majors", ...majors]}
              renderItem={(major) => <span>{major}</span>}
              getItemValue={(major) => major}
              getItemLabel={(major) => major}
              onItemSelect={(major) => {
                setMajorFilter(major === "All Majors" ? "" : major);
                const params = new URLSearchParams(searchParams);
                params.set("page", "1");
                router.push("?" + params.toString());
              }}
              buttonPlaceholder="All Majors"
              inputPlaceholder="Search majors..."
            />
          </div>
          <div>
            <ClearDuesButton />
          </div>
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
                setActiveSort={handleSortField}
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
                setActiveSort={handleSortField}
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
                setActiveSort={handleSortField}
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
                setActiveSort={handleSortField}
              />
            </TableHead>
            <TableHead className="text-center">
              <Label>Dues Paying?</Label>
            </TableHead>
            <TableHead className="text-center">
              <Label>Company</Label>
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
          {members.map((member) => (
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
                {member.company ?? ""}
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
      <CustomPagination
        className="py-3"
        itemCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
