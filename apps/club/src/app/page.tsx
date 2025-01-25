import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

import About from "./_components/landing/about";
import CalendarPage from "./_components/landing/calendar";
import Discover from "./_components/landing/discover";
import Hero from "./_components/landing/Hero";
import Impact from "./_components/landing/Impact";
import Sponsors from "./_components/landing/sponsors";
import { api } from "./trpc/server";

export default async function HomePage() {
  const events = await api.event.getEvents.query();
  const memberCount = await api.member.getMemberCount.query();

  const eventMap = new Map<number, ReturnEvent[]>();

  events.forEach((event) => {
    const day = event.start_datetime.getDate();
    if (!eventMap.has(day)) {
      eventMap.set(day, []);
    }
    eventMap.get(day)?.push(event);
  });

  return (
    <div className="bg-[#0F172A]">
      <Hero />
      <About />
      <Impact />
      <Sponsors />
      <CalendarPage events={eventMap} />
      <Discover memberCount={memberCount} />
    </div>
  );
}
