"use client";

import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
} from "@fullcalendar/core";
import { useRef, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { CreateEditDialog } from "../issues/create-edit-dialog";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [title, setTitle] = useState("Calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<"create" | "edit">("create");
  const [selectedIssueData, setSelectedIssueData] = useState<
    Partial<ISSUE.IssueSubmitValues>
  >({});

  function handleDateSelect(selectionInfo: DateSelectArg) {
    selectionInfo.view.calendar.unselect();
    setModalIntent("create");
    setSelectedIssueData({
      date: selectionInfo.start,
    });
    setIsModalOpen(true);
  }

  function handleIssueButton() {
    setModalIntent("create");
    setSelectedIssueData({
      date: new Date(),
      isEvent: true,
    });
    setIsModalOpen(true);
  }

  function handleIssueClick(clickInfo: EventClickArg) {
    setModalIntent("edit");

    setSelectedIssueData({
      id: clickInfo.event.id,
    });
    setIsModalOpen(true);
  }

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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={handleIssueButton}
          >
            Issue
          </Button>
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
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          datesSet={handleDatesSet}
          height="100%"
          stickyHeaderDates={true}
          handleWindowResize={true}
          expandRows={true}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleIssueClick}
          selectMirror={true}
        />
      </div>

      <CreateEditDialog
        open={isModalOpen}
        intent={modalIntent}
        initialValues={selectedIssueData}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(values) => {
          setIsModalOpen(false);
        }}
      />
    </section>
  );
}
