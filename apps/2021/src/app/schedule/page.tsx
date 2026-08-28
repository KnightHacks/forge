import type { Metadata } from "next";

import { ArchiveShell } from "~/components/archive-shell";
import schedule from "~/data/schedule.json";

export const metadata: Metadata = { title: "Schedule" };

const tagColors: Record<string, string> = {
  General: "#f3a2bd",
  Backend: "#a9e5df",
  Frontend: "#f4ceb7",
  Beginner: "#dced91",
  "Professional Development": "#b8dce4",
  "Non-Technical": "#dcc5f1",
  Security: "#c4d7f2",
  Mobile: "#e8c5d9",
  "Game Development": "#f2d0a7",
  Social: "#f2b6c6",
  "Web Development": "#c6dfb6",
};

export default function SchedulePage() {
  return (
    <ArchiveShell>
      <div className="my-4 grid w-full flex-col md:my-12">
        <h1 className="font-sansita my-10 justify-self-center text-4xl sm:text-4xl md:text-6xl xl:text-7xl">
          Schedule
        </h1>
        {schedule.map((day) => (
          <section
            key={day.dayName}
            className="archive-schedule-day ml-10 lg:ml-24"
          >
            <h2 className="font-sansita my-4 text-2xl sm:text-3xl xl:text-4xl">
              {day.dayName}
            </h2>
            {day.events.map((event) => (
              <div key={`${event.time}-${event.title}`} className="mb-5">
                <div className="font-palanquin archive-event-line mb-1 space-x-4 text-base sm:text-lg md:text-xl xl:text-2xl">
                  <span className="font-palanquinbold">
                    {event.time.trim()}
                  </span>
                  <span>{event.title}</span>
                </div>
                <div className="archive-tags">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{ backgroundColor: tagColors[tag] ?? "#d9e3f0" }}
                      className="font-palanquin dark:text-darkblue mr-2 rounded-full px-3 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </ArchiveShell>
  );
}
