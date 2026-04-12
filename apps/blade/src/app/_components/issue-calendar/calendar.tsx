"use client";

import "./calendar.css";

import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  SlotLabelContentArg,
} from "@fullcalendar/core";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  SlidersHorizontal,
} from "lucide-react";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { CreateEditDialog } from "../issues/create-edit-dialog";
import { IssueFetcherPane } from "../issues/issue-fetcher-pane";
import IssueTemplateDialog from "../issues/issue-template-dialog";
import { CalendarIssueDialog } from "./calendar-issue-dialog";
import { IssueStatusDotLegend } from "./issue-status-dot-legend";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

type IssueCalendarStatus = ISSUE.IssueFetcherPaneIssue["status"];

function issueStatusLabel(status: IssueCalendarStatus) {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function startOfLocalDay(isoOrDate: Date): Date {
  const d = new Date(isoOrDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function issueCalendarSlot(issueDate: Date): { start: Date; end: Date } {
  const start = new Date(issueDate);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

/** Matches `normalizeTaskDueDate` — calendar shows these in the all-day row (week/day). */
function isDefaultTaskDueMoment(d: Date): boolean {
  return (
    d.getHours() === ISSUE.TASK_DUE_HOURS &&
    d.getMinutes() === ISSUE.TASK_DUE_MINUTES &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateFromDataDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return new Date(dateStr);
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (![y, m, d].every((n) => Number.isFinite(n))) return new Date(dateStr);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function scrollTimeStrForEarliestIssue(slots: EventInput[]): string | null {
  let min = Infinity;
  for (const slot of slots) {
    if (slot.allDay) continue;
    if (slot.start == null) continue;
    const t = +new Date(slot.start as string | Date);
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

function dismissFullCalendarMorePopovers() {
  document.querySelectorAll(".fc-more-popover").forEach((el) => {
    el.remove();
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** FC often renders "11AM"; normalize to "11 AM" (keeps existing spaces intact). */
function slotLabelHtmlFromFullCalendarText(text: string): string {
  return text.replace(/(\d{1,2}(?::\d{2})?)(AM|PM)/gi, "$1 $2");
}

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarSectionRef = useRef<HTMLElement | null>(null);
  const suppressNextDateSelectRef = useRef(false);
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [title, setTitle] = useState("Calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailIssueId, setDetailIssueId] = useState<string | null>(null);
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

  const openCount = useMemo(
    () => rawPaneIssues.filter((issue) => issue.status !== "FINISHED").length,
    [rawPaneIssues],
  );
  const closedCount = rawPaneIssues.length - openCount;

  const filters = paneData?.filters;

  const activeFilters = useMemo(() => {
    if (!filters) return [];
    const tags: string[] = [];
    if (filters.statusFilter !== "all")
      tags.push(formatStatus(filters.statusFilter));
    if (filters.teamFilter !== "all") tags.push("Team selected");
    if (filters.issueKind !== "all")
      tags.push(
        filters.issueKind === "task" ? "Tasks only" : "Event-linked only",
      );
    if (filters.rootOnly) tags.push("Root only");
    if (filters.dateFrom) tags.push("From " + filters.dateFrom);
    if (filters.dateTo) tags.push("To " + filters.dateTo);
    if (filters.searchTerm.trim())
      tags.push('Search "' + filters.searchTerm.trim() + '"');
    return tags;
  }, [filters]);

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

  const issueCalendarItems = useMemo<EventInput[]>(() => {
    return issuesInVisibleRange.flatMap((issue): EventInput[] => {
      if (!issue.date) return [];
      const d = new Date(issue.date);
      const baseClassNames = [
        "calendar-issue",
        issue.event ? "calendar-issue--linked" : "calendar-issue--task",
        ...(issue.status === "FINISHED" ? ["calendar-issue--finished"] : []),
      ] as string[];

      /*
       * Event-linked issues use real start times. Tasks default to TASK_DUE_* (11pm local);
       * show those in the all-day band on week/day instead of stacking at the bottom.
       */
      const useAllDayBand =
        !issue.event && isDefaultTaskDueMoment(d);

      if (useAllDayBand) {
        return [
          {
            id: issue.id,
            title: issue.name,
            start: startOfLocalDay(d),
            allDay: true,
            display: "block" as const,
            extendedProps: { issueStatus: issue.status },
            classNames: baseClassNames,
          },
        ];
      }

      const { start, end } = issueCalendarSlot(d);
      return [
        {
          id: issue.id,
          title: issue.name,
          start,
          end,
          allDay: false,
          display: "block" as const,
          extendedProps: { issueStatus: issue.status },
          classNames: baseClassNames,
        },
      ];
    });
  }, [issuesInVisibleRange]);

  const fullCalendarViews = useMemo(
    () => ({
      dayGridMonth: {
        /* Cap visible chips; overflow uses "+N more" → day view (see moreLinkClick). */
        dayMaxEvents: 3,
      },
      timeGridWeek: {
        dayHeaderFormat: { weekday: "short" as const, day: "numeric" as const },
      },
      timeGridDay: {
        dayHeaderFormat: {
          weekday: "long" as const,
          month: "long" as const,
          day: "numeric" as const,
          year: "numeric" as const,
        },
      },
    }),
    [],
  );

  useEffect(() => {
    if (view !== "timeGridWeek" && view !== "timeGridDay") return;
    const scrollStr = scrollTimeStrForEarliestIssue(issueCalendarItems);
    if (!scrollStr) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calendarRef.current?.getApi().scrollToTime(scrollStr);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [view, issueCalendarItems]);

  useEffect(() => {
    if (isModalOpen || isDetailOpen || isFiltersOpen) {
      dismissFullCalendarMorePopovers();
    }
  }, [isModalOpen, isDetailOpen, isFiltersOpen]);

  useEffect(() => {
    const root = calendarSectionRef.current;
    if (!root) return;

    function goToDayViewFromDayNumber(e: Event) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const num = t.closest(".fc-daygrid-day-number");
      if (!num) return;

      const api = calendarRef.current?.getApi();
      if (api?.view.type !== "dayGridMonth") return;

      const dayCell = num.closest(".fc-daygrid-day");
      const dateStr = dayCell?.getAttribute("data-date");
      if (!dateStr) return;

      suppressNextDateSelectRef.current = true;
      e.preventDefault();
      e.stopImmediatePropagation();
      api.unselect();
      setView("timeGridDay");
      api.changeView("timeGridDay", dateFromDataDate(dateStr));
    }

    function onMouseDownCapture(e: MouseEvent) {
      goToDayViewFromDayNumber(e);
    }

    function onPointerDownCapture(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      goToDayViewFromDayNumber(e);
    }

    root.addEventListener("mousedown", onMouseDownCapture, true);
    root.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => {
      root.removeEventListener("mousedown", onMouseDownCapture, true);
      root.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [view]);

  const headerCreateInitialValues = useMemo<Partial<ISSUE.IssueSubmitValues>>(
    () => ({
      date: new Date(),
      isEvent: true,
    }),
    [],
  );

  function handleDateSelect(selectionInfo: DateSelectArg) {
    selectionInfo.view.calendar.unselect();

    if (suppressNextDateSelectRef.current) {
      suppressNextDateSelectRef.current = false;
      return;
    }

    const origin = selectionInfo.jsEvent?.target;
    if (origin instanceof Element && origin.closest(".fc-daygrid-day-number")) {
      return;
    }

    dismissFullCalendarMorePopovers();
    setModalIntent("create");
    setSelectedIssueData({
      date: selectionInfo.start,
    });
    setIsModalOpen(true);
  }

  const issueSlotLabelContent = useCallback((arg: SlotLabelContentArg) => {
    return {
      html: slotLabelHtmlFromFullCalendarText(arg.text),
    };
  }, []);

  const issueEventContent = useCallback((arg: EventContentArg) => {
    if (!arg.event.classNames.includes("calendar-issue")) {
      return undefined;
    }
    const ex = arg.event.extendedProps as { issueStatus?: IssueCalendarStatus };
    const status: IssueCalendarStatus = ex.issueStatus ?? "BACKLOG";
    const statusLabel = issueStatusLabel(status);
    return (
      <div
        className="fc-event-main calendar-issue-event-main"
        title={`${statusLabel}: ${arg.event.title}`}
      >
        <span
          className="issue-calendar-status-dot size-2 shrink-0 rounded-full ring-1 ring-primary-foreground/25"
          data-issue-status={status}
          aria-hidden
        />
        <span className="fc-event-title min-w-0 flex-1 truncate text-inherit">
          {arg.event.title}
        </span>
      </div>
    );
  }, []);

  function handleIssueClick(clickInfo: EventClickArg) {
    const id = String(clickInfo.event.id);
    const issue = issuesInVisibleRange.find((i) => i.id === id);
    if (!issue) return;
    dismissFullCalendarMorePopovers();
    setDetailIssueId(id);
    setIsDetailOpen(true);
  }

  function handleDatesSet(arg: DatesSetArg) {
    const t = arg.view.type;
    if (t === "dayGridMonth" || t === "timeGridWeek" || t === "timeGridDay") {
      setView(t);
    }
    if (t === "timeGridDay") {
      setTitle(
        arg.start.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      );
    } else {
      setTitle(arg.view.title);
    }
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
    <section
      ref={calendarSectionRef}
      className="calendar-theme mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col gap-3 py-1"
    >
      <div className="flex shrink-0 flex-col gap-3">
        {/* Date nav (left) — view tabs (right), Google Calendar–style */}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            <h2 className="min-w-0 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h2>
          </div>

          <Tabs
            value={view}
            onValueChange={handleViewChange}
            className="w-full shrink-0 sm:w-auto"
          >
            <TabsList className="flex h-9 w-full justify-start sm:w-auto sm:justify-end">
              <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
              <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
              <TabsTrigger value="timeGridDay">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Row 2: single surface — status + filter pills (one group) | primary actions */}
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <div
            className={cn(
              "flex flex-col gap-3",
              activeFilters.length > 0
                ? "md:flex-row md:items-start md:justify-between md:gap-6"
                : "sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:gap-6",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CircleDot className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{openCount} Open</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{closedCount} Closed</span>
                </div>
              </div>
              {activeFilters.length > 0 ? (
                <div className="flex min-w-0 flex-wrap gap-2 border-t border-border/60 pt-2">
                  <span className="sr-only">Active filters</span>
                  {activeFilters.map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
              <CreateEditDialog
                intent="create"
                initialValues={headerCreateInitialValues}
              >
                <Button
                  type="button"
                  onClick={() => {
                    dismissFullCalendarMorePopovers();
                  }}
                >
                  Create issue
                </Button>
              </CreateEditDialog>
              <IssueTemplateDialog />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  dismissFullCalendarMorePopovers();
                  setIsFiltersOpen(true);
                }}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-sm">
        <IssueStatusDotLegend />
        <div className="min-h-0 w-full min-w-0 flex-1">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            allDaySlot={true}
            allDayText="Due"
            displayEventTime={false}
            displayEventEnd={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            eventMinHeight={22}
            datesSet={handleDatesSet}
            events={issueCalendarItems}
            views={fullCalendarViews}
            /* Navigate to day view instead of opening the overflow popover. */
            moreLinkClick="timeGridDay"
            moreLinkHint="Open this day in day view"
            moreLinkContent={(arg) => ({
              html: `+${arg.num} more`,
            })}
            height="100%"
            stickyHeaderDates={true}
            handleWindowResize={true}
            expandRows={view !== "dayGridMonth"}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleIssueClick}
            eventContent={issueEventContent}
            slotLabelContent={issueSlotLabelContent}
            selectMirror={true}
          />
        </div>
      </div>

      <CalendarIssueDialog
        issueId={detailIssueId}
        open={isDetailOpen}
        onOpenChange={(next) => {
          setIsDetailOpen(next);
          if (!next) setDetailIssueId(null);
        }}
        onRequestEdit={(values) => {
          setModalIntent("edit");
          setSelectedIssueData(values);
          setIsModalOpen(true);
        }}
      />

      <CreateEditDialog
        key={`${modalIntent}-${modalIntent === "edit" ? selectedIssueData.id : selectedIssueData.date instanceof Date ? selectedIssueData.date.getTime() : "create"}`}
        open={isModalOpen}
        intent={modalIntent}
        initialValues={selectedIssueData}
        onClose={() => setIsModalOpen(false)}
        onSubmit={() => {
          setIsModalOpen(false);
          void utils.issues.getAllIssues.invalidate();
          void utils.issues.invalidate();
          paneData?.refresh();
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
