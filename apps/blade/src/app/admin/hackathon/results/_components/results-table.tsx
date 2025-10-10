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
 
 import SortButton from "~/app/admin/_components/SortButton";
 import { getFormattedDate } from "~/lib/utils";
 import { api } from "~/trpc/react";

 
 type Event = ReturnEvent;
 type SortField = keyof Event;
 type SortOrder = "asc" | "desc" | null;
 
 export function ResultsTable() {
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
     <main className="container h-screen">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="py-12">
          <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
            Hackathon Results
          </h1>
        </div>
      </div>

        <div className="relative w-full mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search Projects"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            />
            {/* Filter button goes here */}
        </div>

       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="text-center">
               <SortButton
                 field="name"
                 label="Project Name"
                 sortField={sortField}
                 sortOrder={sortOrder}
                 setSortField={setSortField}
                 setSortOrder={setSortOrder}
               />
             </TableHead>
             <TableHead className="text-center">
                <Label>DevPost</Label>
             </TableHead>
             <TableHead className="text-center">
                <Label>Content</Label> 
            </TableHead>
             <TableHead className="text-center">
                <Label>Status</Label>
             </TableHead>
             <TableHead className="text-right">
             </TableHead>
             <TableHead className="text-center">
               <Label>Challenges</Label>
             </TableHead>
             <TableHead className="text-center">
               <SortButton
                 field="numAttended"
                 label="Specific"
                 sortField={sortField}
                 sortOrder={sortOrder}
                 setSortField={setSortField}
                 setSortOrder={setSortOrder}
               />
             </TableHead>
             <TableHead className="text-center">
               <SortButton
                 field="numAttended"
                 label="Rating"
                 sortField={sortField}
                 sortOrder={sortOrder}
                 setSortField={setSortField}
                 setSortOrder={setSortOrder}
               />
             </TableHead>
           </TableRow>
         </TableHeader>
       </Table>
     </main>
   );
 }
 