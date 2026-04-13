"use client";

import "./calendar.css";

import type {
  DateSelectArg,
  DatesSetArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  MoreLinkArg,
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
import { IssueDayAgenda } from "./calendar-day-agenda";
import { IssueStatusDotLegend } from "./calendar-status-dot-legend";

type CalendarView = "dayGridMonth" | "dayGridWeek" | "issueDayAgenda";

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

/** Default task-due time → all-day band in month/week grid (see normalizeTaskDueDate). */
function isDefaultTaskDueMoment(d: Date): boolean {
  return (
    d.getHours() === ISSUE.TASK_DUE_HOURS &&
    d.getMinutes() === ISSUE.TASK_DUE_MINUTES &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  );
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

function elementFromEventTarget(target: EventTarget | null): Element | null {
  if (!target) return null;
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
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

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarSectionRef = useRef<HTMLElement | null>(null);
  const suppressNextDateSelectRef = useRef(false);
  const prevViewRef = useRef<CalendarView>("dayGridMonth");
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [agendaDay, setAgendaDay] = useState(() => startOfLocalDay(new Date()));
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

  const issuesForCurrentView = useMemo(() => {
    if (view === "issueDayAgenda") {
      const vs = startOfLocalDay(agendaDay).getTime();
      const ve = vs + 86400000;
      return issuesForCalendar.filter((issue) => {
        if (!issue.date) return false;
        const day = startOfLocalDay(new Date(issue.date)).getTime();
        return day >= vs && day < ve;
      });
    }
    if (!visibleRange) return issuesForCalendar;
    const vs = startOfLocalDay(visibleRange.start).getTime();
    const ve = visibleRange.end.getTime();
    return issuesForCalendar.filter((issue) => {
      if (!issue.date) return false;
      const day = startOfLocalDay(new Date(issue.date)).getTime();
      return day >= vs && day < ve;
    });
  }, [view, agendaDay, visibleRange, issuesForCalendar]);

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
    if (view === "issueDayAgenda") return [];
    return issuesForCurrentView.flatMap((issue): EventInput[] => {
      if (!issue.date) return [];
      const d = new Date(issue.date);
      const baseClassNames = [
        "calendar-issue",
        issue.event ? "calendar-issue--linked" : "calendar-issue--task",
        ...(issue.status === "FINISHED" ? ["calendar-issue--finished"] : []),
      ] as string[];

      const useAllDayBand = !issue.event && isDefaultTaskDueMoment(d);

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
  }, [view, issuesForCurrentView]);

  const fullCalendarViews = useMemo(
    () => ({
      dayGridMonth: {
        dayMaxEvents: 3,
        fixedWeekCount: true,
      },
      dayGridWeek: {
        dayMaxEvents: false,
      },
    }),
    [],
  );

  /** “+more” day: prefer data-date / hiddenSegs; arg.date can drift across TZs. */
  const dayDateFromMoreLinkArg = useCallback((arg: MoreLinkArg) => {
    const el = elementFromEventTarget(arg.jsEvent.target ?? null);
    if (el) {
      const dayEl = el.closest(".fc-daygrid-day");
      const ds = dayEl?.getAttribute("data-date");
      if (ds) return dateFromDataDate(ds);
    }
    const hidden = (
      arg as unknown as {
        hiddenSegs?: { eventRange?: { range?: { start?: Date } } }[];
      }
    ).hiddenSegs;
    const start = hidden?.[0]?.eventRange?.range?.start;
    if (start) return startOfLocalDay(start);
    return startOfLocalDay(arg.date);
  }, []);

  const goToAgendaForDay = useCallback((d: Date) => {
    const day = startOfLocalDay(d);
    dismissFullCalendarMorePopovers();
    setAgendaDay(day);
    setView("issueDayAgenda");
    setVisibleRange({
      start: day,
      end: new Date(day.getTime() + 86400000),
    });
  }, []);

  const handleMoreLinkClick = useCallback(
    (arg: MoreLinkArg) => {
      goToAgendaForDay(dayDateFromMoreLinkArg(arg));
      return "none" as const;
    },
    [dayDateFromMoreLinkArg, goToAgendaForDay],
  );

  useEffect(() => {
    const root = calendarSectionRef.current;
    if (!root) return;

    function onMoreLinkClickCapture(e: MouseEvent) {
      const section = calendarSectionRef.current;
      if (!section) return;
      const el = elementFromEventTarget(e.target);
      const link = el?.closest(".fc-daygrid-more-link");
      if (!link || !section.contains(link)) return;
      const dayEl = link.closest(".fc-daygrid-day");
      const ds = dayEl?.getAttribute("data-date");
      if (!ds) return;
      e.preventDefault();
      e.stopPropagation();
      goToAgendaForDay(dateFromDataDate(ds));
    }

    root.addEventListener("click", onMoreLinkClickCapture, true);
    return () => {
      root.removeEventListener("click", onMoreLinkClickCapture, true);
    };
  }, [goToAgendaForDay]);

  useEffect(() => {
    if (isModalOpen || isDetailOpen || isFiltersOpen) {
      dismissFullCalendarMorePopovers();
    }
  }, [isModalOpen, isDetailOpen, isFiltersOpen]);

  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = view;
    if (view !== "dayGridMonth" && view !== "dayGridWeek") return;
    if (prev !== "issueDayAgenda") return;
    requestAnimationFrame(() => {
      calendarRef.current?.getApi().gotoDate(agendaDay);
    });
  }, [view, agendaDay]);

  useEffect(() => {
    const root = calendarSectionRef.current;
    if (!root) return;

    function goToAgendaFromDayNumber(e: Event) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const num = t.closest(".fc-daygrid-day-number");
      if (!num) return;

      const api = calendarRef.current?.getApi();
      if (!api) return;
      const vt = api.view.type;
      if (vt !== "dayGridMonth" && vt !== "dayGridWeek") return;

      const dayCell = num.closest(".fc-daygrid-day");
      const dateStr = dayCell?.getAttribute("data-date");
      if (!dateStr) return;

      suppressNextDateSelectRef.current = true;
      e.preventDefault();
      e.stopImmediatePropagation();
      api.unselect();
      const d = dateFromDataDate(dateStr);
      setAgendaDay(startOfLocalDay(d));
      setView("issueDayAgenda");
      setVisibleRange({
        start: startOfLocalDay(d),
        end: new Date(startOfLocalDay(d).getTime() + 86400000),
      });
    }

    function onMouseDownCapture(e: MouseEvent) {
      goToAgendaFromDayNumber(e);
    }

    function onPointerDownCapture(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      goToAgendaFromDayNumber(e);
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
      date: view === "issueDayAgenda" ? agendaDay : new Date(),
      isEvent: true,
    }),
    [view, agendaDay],
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

  /** Month: weekday only; week: weekday + day number (matches day agenda). */
  const issueDayHeaderContent = useCallback((arg: DayHeaderContentArg) => {
    const d = arg.date;
    const wd = d.toLocaleDateString(undefined, { weekday: "short" });
    if (arg.view.type === "dayGridMonth") {
      return { html: wd };
    }
    if (arg.view.type === "dayGridWeek") {
      return { html: `${wd} ${d.getDate()}` };
    }
    return undefined;
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
    const issue = issuesForCurrentView.find((i) => i.id === id);
    if (!issue) return;
    dismissFullCalendarMorePopovers();
    setDetailIssueId(id);
    setIsDetailOpen(true);
  }

  function handleDatesSet(arg: DatesSetArg) {
    const t = arg.view.type;
    if (t === "dayGridMonth" || t === "dayGridWeek") {
      setView(t);
    }
    setTitle(arg.view.title);
    setVisibleRange({ start: arg.start, end: arg.end });
  }

  function handleViewChange(nextView: string) {
    if (nextView === "issueDayAgenda") {
      const api = calendarRef.current?.getApi();
      const d = api?.getDate() ?? new Date();
      setAgendaDay(startOfLocalDay(d));
      setView("issueDayAgenda");
      const start = startOfLocalDay(d);
      setVisibleRange({ start, end: new Date(start.getTime() + 86400000) });
      return;
    }
    const typed = nextView as "dayGridMonth" | "dayGridWeek";
    setView(typed);
    requestAnimationFrame(() => {
      calendarRef.current?.getApi().changeView(typed);
    });
  }

  function handleToday() {
    if (view === "issueDayAgenda") {
      const t = startOfLocalDay(new Date());
      setAgendaDay(t);
      setVisibleRange({
        start: t,
        end: new Date(t.getTime() + 86400000),
      });
      return;
    }
    calendarRef.current?.getApi().today();
  }

  function handlePrev() {
    if (view === "issueDayAgenda") {
      setAgendaDay((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() - 1);
        return startOfLocalDay(next);
      });
      return;
    }
    calendarRef.current?.getApi().prev();
  }

  function handleNext() {
    if (view === "issueDayAgenda") {
      setAgendaDay((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return startOfLocalDay(next);
      });
      return;
    }
    calendarRef.current?.getApi().next();
  }

  const headingPrimary = useMemo(() => {
    if (view === "issueDayAgenda") {
      return agendaDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return title;
  }, [view, agendaDay, title]);

  const showFullCalendar = view === "dayGridMonth" || view === "dayGridWeek";

  return (
    <section
      ref={calendarSectionRef}
      className="calendar-theme mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col gap-3 py-1"
    >
      <div className="flex shrink-0 flex-col gap-3">
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
              {headingPrimary}
            </h2>
          </div>

          <Tabs
            value={view}
            onValueChange={handleViewChange}
            className="w-full shrink-0 sm:w-auto"
          >
            <TabsList className="flex h-9 w-full justify-start sm:w-auto sm:justify-end">
              <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
              <TabsTrigger value="dayGridWeek">Week</TabsTrigger>
              <TabsTrigger value="issueDayAgenda">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
        <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden">
          {showFullCalendar ? (
            <FullCalendar
              key="fc-daygrid"
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView={
                view === "dayGridWeek" ? "dayGridWeek" : "dayGridMonth"
              }
              initialDate={agendaDay}
              headerToolbar={false}
              displayEventTime={false}
              displayEventEnd={false}
              datesSet={handleDatesSet}
              events={issueCalendarItems}
              views={fullCalendarViews}
              moreLinkClick={handleMoreLinkClick}
              moreLinkHint="Open day view for this date"
              moreLinkContent={(arg) => ({
                html: `+${arg.num} more`,
              })}
              height="100%"
              stickyHeaderDates={true}
              handleWindowResize={true}
              expandRows={view === "dayGridMonth"}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleIssueClick}
              eventContent={issueEventContent}
              dayHeaderContent={issueDayHeaderContent}
              selectMirror={true}
            />
          ) : (
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <IssueDayAgenda
                day={agendaDay}
                issues={issuesForCurrentView}
                isLoading={paneData?.isLoading ?? true}
                roleNameById={paneData?.roleNameById}
                onIssuesChanged={() => {
                  void utils.issues.getAllIssues.invalidate();
                  void utils.issues.invalidate();
                  paneData?.refresh();
                }}
              />
            </div>
          )}
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
