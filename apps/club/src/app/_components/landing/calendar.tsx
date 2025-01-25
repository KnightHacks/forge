"use client";

import React, { useRef } from "react";
import { Dot } from "lucide-react";
import { Calendar, List } from "rsuite";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

import { formatDateRange } from "~/lib/utils";

import "rsuite/Calendar/styles/index.css";

export default function CalendarEventsPage({
  events,
}: {
  events: Map<number, ReturnEvent[]>;
}) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  function getTodoList(date: Date | null) {
    if (!date) return [];
    return events.get(date.getDate()) ?? [];
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
    <section className="relative min-h-screen bg-gradient-to-br from-purple-900 to-[#0F172A] px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-pragati text-center text-[20px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[45px]">
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
    </section>
  );
}
