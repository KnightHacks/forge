"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { Dot } from "lucide-react";
import { Calendar, List } from "rsuite";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

import { formatDateRange } from "~/lib/utils";
import TerminalSVG from "./assets/terminal";

import "rsuite/Calendar/styles/index.css";

import type { RouterOutputs } from "@forge/api";

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
      { opacity: 100, x: 0, duration: 1 },
    ).fromTo(
      calendarRef.current,
      { opacity: 0, y: 100 },
      { opacity: 100, y: 0, duration: 2, ease: "elastic.out" },
    );
  });

  function getTodoList(date: Date | null) {
    if (!date) return [];
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return eventMap.get(`${day}-${month}-${year}`) ?? [];
  }

  function renderCell(date: Date) {
    const list = getTodoList(date);
    return list.length > 0 ? <Dot /> : null;
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
      className="relative min-h-screen bg-gradient-to-b from-purple-800 to-[#0F172A] px-4 py-12"
    >
      <div className="mx-auto max-w-6xl">
        <h1
          ref={headerRef}
          className="font-pragati text-center text-[20px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[45px]"
        >
          Stay up to date!
        </h1>
        <div
          className={`mt-3 grid items-center gap-8 ${selectedDate ? "lg:grid-cols-2" : "justify-center lg:grid-cols-1"}`}
        >
          <div
            className={`text-center lg:text-left ${selectedDate ? "order-2 lg:order-1" : "order-1 flex justify-center"}`}
          >
            <div
              ref={calendarRef}
              className="w-full max-w-lg rounded-xl bg-[#1E293B]/60 p-6 shadow-2xl backdrop-blur-md"
            >
              <Calendar
                compact
                renderCell={renderCell}
                onSelect={handleSelect}
                className="w-full text-white"
                monthDropdownProps={{
                  itemClassName:
                    "bg-[#1E293B]/80 text-white hover:bg-[#334155] cursor-pointer p-2 rounded-md transition-colors",
                }}
              />
            </div>
          </div>

          {selectedDate && (
            <div className="order-1 lg:order-2">
              <div className="rounded-xl bg-[#1E293B]/60 p-6 shadow-2xl backdrop-blur-md">
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
      <TerminalSVG className="absolute -top-80 right-24 z-0 hidden h-auto w-full max-w-[400px] transform opacity-70 md:block" />
    </section>
  );
}
