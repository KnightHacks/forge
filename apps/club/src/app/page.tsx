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
