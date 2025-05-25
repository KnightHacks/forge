"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { Calendar, List } from "rsuite";

import type { RouterOutputs } from "@forge/api";
import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

import { formatDateRange } from "~/lib/utils";
import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";
import TerminalSVG from "./assets/terminal";

import "rsuite/Calendar/styles/index.css";

export default function CalendarEventsPage({
  events,
}: {
  events: RouterOutputs["event"]["getEvents"];
}) {
  const eventMap = new Map<string, ReturnEvent[]>();
  events.forEach((event) => {
    const day = event.start_datetime.getDate();
    const month = event.start_datetime.getMonth();
    const year = event.start_datetime.getFullYear();
    const dateString = `${day}-${month}-${year}`;
    if (!eventMap.has(dateString)) {
      eventMap.set(dateString, []);
    }
    eventMap.get(dateString)?.push(event);
  });
  gsap.registerPlugin(ScrollTrigger);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        end: "bottom 20%",
        once: true,
      },
    });
    tl.fromTo(
      headerRef.current,
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 1 },
    ).fromTo(
      calendarRef.current,
      { opacity: 0, y: 100 },
      { opacity: 1, y: 0, duration: 2, ease: "elastic.out" },
    );
  });
  function getTodoList(date: Date | null) {
    if (!date) return [];
    const key = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
    return eventMap.get(key) ?? [];
  }
  function renderCell(date: Date) {
    const hasEvents = getTodoList(date).length > 0;
    return hasEvents ? (
      <span data-event-marker className="sr-only">
        •
      </span>
    ) : null;
  }
  const TodoList = ({ date }: { date: Date }) => {
    const list = getTodoList(date);
    if (!list.length) {
      return (
        <ul className="space-y-2">
          <li className="rounded-md bg-purple-900/50 p-3 text-white">
            No events for this date
          </li>
        </ul>
      );
    }
    return (
      <List bordered style={{ flex: 1 }}>
        {list.map((item) => (
          <List.Item
            key={item.id}
            className="mb-4 rounded-lg bg-purple-900/30 p-3 text-white"
          >
            <div className="flex justify-between">
              <span>
                {formatDateRange(item.start_datetime, item.end_datetime)}
              </span>
              <span>{item.name}</span>
            </div>
          </List.Item>
        ))}
      </List>
    );
  };
  const handleSelect = (date: Date) => {
    setSelectedDate(date);
  };
  return (
    <section
      ref={containerRef}
      className="relative min-h-screen overflow-hidden px-4 py-12"
    >
      <div className="mx-auto max-w-6xl">
        <h1
          ref={headerRef}
          className="font-pragati pb-32 text-center text-[20px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[45px]"
        >
          Stay up to date!
        </h1>
        <div
          className={`mt-3 grid items-center gap-8 ${
            selectedDate ? "lg:grid-cols-2" : "justify-center lg:grid-cols-1"
          }`}
        >
          <div
            className={`text-center lg:text-left ${
              selectedDate
                ? "order-2 lg:order-1"
                : "order-1 flex justify-center"
            }`}
          >
            <div
              ref={calendarRef}
              className="w-full max-w-lg rounded-xl bg-[#1E293B]/50 p-6 shadow-xl shadow-purple-900/40 backdrop-blur-md"
            >
              <Calendar
                compact
                renderCell={renderCell}
                onSelect={handleSelect}
                className="w-full text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] [&_.rs-calendar-table-cell-content:focus]:border-none [&_.rs-calendar-table-cell-content:focus]:shadow-none [&_.rs-calendar-table-cell-content:focus]:outline-none [&_.rs-calendar-table-cell-content:focus]:ring-0 [&_.rs-calendar-table-cell-content:has([data-event-marker])]:text-yellow-400 [&_.rs-calendar-table-cell-content:hover]:border-none [&_.rs-calendar-table-cell-content:hover]:bg-[#1E293B]/70 [&_.rs-calendar-table-cell-content:hover]:text-purple-300 [&_.rs-calendar-table-cell-content:hover]:shadow-none [&_.rs-calendar-table-cell-content]:rounded-md [&_.rs-calendar-table-cell-content]:border-none [&_.rs-calendar-table-cell-content]:shadow-none [&_.rs-calendar-table-cell-content]:transition [&_.rs-calendar-table-cell-content]:duration-150 [&_.rs-calendar-table-cell-selected]:!border-none [&_.rs-calendar-table-cell-selected]:!bg-purple-900 [&_.rs-calendar-table-cell-selected]:!text-white [&_.rs-calendar-table-cell-selected_.rs-calendar-table-cell-content]:shadow-none [&_.rs-calendar-table-cell-today]:text-purple-400"
                monthDropdownProps={{
                  itemClassName:
                    "bg-[#1E293B]/50 text-white hover:bg-[#334155] cursor-pointer p-2 rounded-md transition-colors",
                }}
                showWeekDays
              />
            </div>
          </div>
          {selectedDate && (
            <div className="order-1 lg:order-2">
              <div className="rounded-xl bg-[#1E293B]/60 p-6 shadow-xl shadow-purple-900/40 backdrop-blur-md">
                <h2 className="mb-4 text-2xl text-white">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                  })}{" "}
                  Events
                </h2>
                <TodoList date={selectedDate} />
              </div>
            </div>
          )}
        </div>
      </div>
      <TerminalSVG className="animate-float absolute -top-80 right-12 z-0 hidden h-auto w-full max-w-[400px] transform opacity-70 md:block" />
      <SwordSVG className="animate-float absolute -bottom-72 left-0 hidden w-[500px] text-purple-400 opacity-50 md:block" />
      <NeonTkSVG className="animate-float absolute -bottom-32 right-24 hidden w-[400px] text-purple-500 opacity-50 md:block" />
    </section>
  );
}
