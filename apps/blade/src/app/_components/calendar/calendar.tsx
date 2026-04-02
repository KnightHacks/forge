"use client";

import type { DatesSetArg } from "@fullcalendar/core";
import { useRef, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [title, setTitle] = useState("Calendar");

  function handleDatesSet(arg: DatesSetArg) {
    setTitle(arg.view.title);
  }

  function handleViewChange(nextView: string) {
    const typedView = nextView as CalendarView;
    setView(typedView);
    calendarRef.current?.getApi().changeView(typedView);
  }

  function handleToday() {
    calendarRef.current?.getApi().today();
  }

  function handlePrev() {
    calendarRef.current?.getApi().prev();
  }

  function handleNext() {
    calendarRef.current?.getApi().next();
  }

  return (
    <section className="calendar-theme h-full">
      <div className="mb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNext}
          >
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        </div>

        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
            <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
            <TabsTrigger value="timeGridDay">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="h-[75vh] min-w-0 overflow-hidden rounded-xl border bg-card p-3 shadow-sm md:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView={view}
          headerToolbar={false}
          datesSet={handleDatesSet}
          height="100%"
          stickyHeaderDates={true}
          handleWindowResize={true}
          expandRows={true}
        />
      </div>
    </section>
  );
}
