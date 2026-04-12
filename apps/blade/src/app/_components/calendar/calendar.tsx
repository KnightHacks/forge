"use client";

import "./calendar.css";

import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { CreateEditDialog } from "../issues/create-edit-dialog";
import { IssueFetcherPane } from "../issues/issue-fetcher-pane";
import IssueTemplateDialog from "../issues/issue-template-dialog";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

/** Calendar-local midnight for an issue due date. */
function startOfLocalDay(isoOrDate: Date): Date {
  const d = new Date(isoOrDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Use stored `issue.date` (due time for tasks, event start for event-linked issues).
 * End is only for layout in timeGrid; month view hides the end via `displayEventEnd`.
 */
function issueCalendarSlot(issueDate: Date): { start: Date; end: Date } {
  const start = new Date(issueDate);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** `HH:mm:ss` for FullCalendar.scrollToTime — scroll slightly above earliest event (tasks often due 11 PM). */
function scrollTimeStrForEarliestEvent(events: EventInput[]): string | null {
  let min = Infinity;
  for (const e of events) {
    if (e.start == null) continue;
    const t = +new Date(e.start as string | Date);
    if (!Number.isNaN(t)) min = Math.min(min, t);
  }
  if (min === Infinity) return null;
  const d = new Date(min);
  d.setMinutes(d.getMinutes() - 45, 0, 0);
  const dayStart = startOfLocalDay(d);
  if (d.getTime() < dayStart.getTime()) {
    d.setTime(dayStart.getTime());
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [title, setTitle] = useState("Calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<"create" | "edit">("create");
  const [selectedIssueData, setSelectedIssueData] = useState<
    Partial<ISSUE.IssueSubmitValues>
  >({});
  const [visibleRange, setVisibleRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [paneData, setPaneData] = useState<ISSUE.IssueFetcherPaneData | null>(
    null,
  );

  /** Pane clears issues while refetching; deferred value keeps prior list visible during load. */
  const rawPaneIssues = useMemo(
    () => paneData?.issues ?? [],
    [paneData?.issues],
  );
  const deferredPaneIssues = useDeferredValue(rawPaneIssues);
  const issuesForCalendar = useMemo(() => {
    if (!paneData) return [] as ISSUE.IssueFetcherPaneIssue[];
    if (!paneData.isLoading) {
      return rawPaneIssues;
    }
    if (rawPaneIssues.length > 0) {
      return rawPaneIssues;
    }
    return deferredPaneIssues;
  }, [paneData, rawPaneIssues, deferredPaneIssues]);

  /** Clip to FullCalendar’s visible window (end is exclusive); pane fetch isn’t range-scoped here. */
  const issuesInVisibleRange = useMemo(() => {
    if (!visibleRange) return issuesForCalendar;
    const vs = startOfLocalDay(visibleRange.start).getTime();
    const ve = visibleRange.end.getTime();
    return issuesForCalendar.filter((issue) => {
      if (!issue.date) return false;
      const day = startOfLocalDay(new Date(issue.date)).getTime();
      return day >= vs && day < ve;
    });
  }, [issuesForCalendar, visibleRange]);

  const utils = api.useUtils();

  const deleteIssueMutation = api.issues.deleteIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      paneData?.refresh();
      toast.success("Issue deleted successfully");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to delete issue");
    },
  });

  const calendarEvents = useMemo<EventInput[]>(() => {
    const list = issuesInVisibleRange as {
      id: string;
      name: string;
      date: Date | null;
      event: string | null;
    }[];

    const events = list.flatMap((issue) => {
      if (!issue.date) return [];
      const { start, end } = issueCalendarSlot(new Date(issue.date));
      return [
        {
          id: issue.id,
          title: issue.name,
          start,
          end,
          allDay: false,
          display: "block" as const,
          classNames: issue.event ? ["issue-event-linked"] : ["issue-task"],
        },
      ];
    });

    events.sort((a, b) => {
      const ta = +new Date(a.start);
      const tb = +new Date(b.start);
      if (ta !== tb) return ta - tb;
      return String(a.title).localeCompare(String(b.title));
    });

    return events;
  }, [issuesInVisibleRange]);

  useEffect(() => {
    if (view !== "timeGridWeek" && view !== "timeGridDay") return;
    const scrollStr = scrollTimeStrForEarliestEvent(calendarEvents);
    if (!scrollStr) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calendarRef.current?.getApi().scrollToTime(scrollStr);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [view, calendarEvents]);

  const headerCreateInitialValues = useMemo<Partial<ISSUE.IssueSubmitValues>>(
    () => ({
      date: new Date(),
      isEvent: true,
    }),
    [],
  );

  function handleDateSelect(selectionInfo: DateSelectArg) {
    selectionInfo.view.calendar.unselect();
    setModalIntent("create");
    setSelectedIssueData({
      date: selectionInfo.start,
    });
    setIsModalOpen(true);
  }

  function handleIssueClick(clickInfo: EventClickArg) {
    const id = String(clickInfo.event.id);
    const issue = issuesInVisibleRange.find((i) => i.id === id);

    setModalIntent("edit");
    if (issue) {
      setSelectedIssueData({
        id: issue.id,
        status: issue.status,
        name: issue.name,
        description: issue.description,
        links: issue.links ?? [],
        date: issue.date ?? undefined,
        priority: issue.priority,
        team: issue.team,
        parent: issue.parent ?? undefined,
        isEvent: issue.event !== null,
        event: issue.event,
        teamVisibilityIds: issue.teamVisibility.map((t) => t.teamId),
        assigneeIds: issue.userAssignments.map((u) => u.userId),
      });
    } else {
      setSelectedIssueData({ id });
    }
    setIsModalOpen(true);
  }

  function handleDatesSet(arg: DatesSetArg) {
    setTitle(arg.view.title);
    setVisibleRange({ start: arg.start, end: arg.end });
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
    <section className="calendar-theme flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className="mb-3 shrink-0 space-y-3">
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

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <CreateEditDialog
              intent="create"
              initialValues={headerCreateInitialValues}
            >
              <Button type="button">Create issue</Button>
            </CreateEditDialog>
            <IssueTemplateDialog />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFiltersOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
            <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
            <TabsTrigger value="timeGridDay">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="min-h-0 w-full min-w-0 flex-1">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            allDaySlot={false}
            displayEventTime={false}
            displayEventEnd={false}
            eventOrder="start"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            datesSet={handleDatesSet}
            events={calendarEvents}
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
      </div>

      <CreateEditDialog
        key={`${modalIntent}-${modalIntent === "edit" ? selectedIssueData.id : selectedIssueData.date instanceof Date ? selectedIssueData.date.getTime() : "create"}`}
        open={isModalOpen}
        intent={modalIntent}
        initialValues={selectedIssueData}
        onClose={() => setIsModalOpen(false)}
        onSubmit={() => {
          setIsModalOpen(false);
          void utils.issues.getAllIssues.invalidate();
        }}
        onDelete={(values) => {
          if (!values.id || deleteIssueMutation.isPending) return;
          deleteIssueMutation.mutate({ id: values.id });
        }}
      />

      <IssueFetcherPane
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onDataChange={setPaneData}
      />
    </section>
  );
}
