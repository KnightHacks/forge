"use client";

import React from "react";
import { Badge, Calendar, List } from "rsuite";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

import { formatDateRange } from "~/lib/utils";

import "rsuite/Calendar/styles/index.css";

export default function CalendarEventsPage({
  events,
}: {
  events: Map<number, ReturnEvent[]>;
}) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  function getTodoList(date: Date | null) {
    if (!date) return [];
    return events.get(date.getDate()) ?? [];
  }

  function renderCell(date: Date) {
    const list = getTodoList(date);
    return list.length > 0 ? (
      <Badge className="calendar-todo-item-badge" />
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
          <List.Item key={item.id} className="bg-purple-900/30 text-white">
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
        <div
          className={`grid min-h-[calc(100vh-6rem)] items-center gap-8 ${selectedDate ? "lg:grid-cols-2" : "justify-center lg:grid-cols-1"}`}
        >
          <div
            className={`text-center lg:text-left ${selectedDate ? "order-2 lg:order-1" : "order-1 flex justify-center"}`}
          >
            <div className="w-full max-w-lg rounded-xl bg-[#1E293B]/60 p-6 shadow-2xl backdrop-blur-md">
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
