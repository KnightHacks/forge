import { env } from "~/env";
import About from "./_components/landing/about";
import CalendarPage from "./_components/landing/calendar";
import Discover from "./_components/landing/discover";
import Hero from "./_components/landing/hero";
import Impact from "./_components/landing/impact";
import Sponsors from "./_components/landing/sponsors";
import { api } from "./trpc/server";

export default async function HomePage() {
  const [events, memberCount] = await Promise.all([
    api.event.getEvents.query(),
    api.member.getMemberCount.query(),
  ]);

  return (
    <div className="bg-[#0F172A]">
      <Hero bladeUrl={env.BLADE_URL} />
      <About />
      <Impact />
      <Sponsors />
      <CalendarPage events={events} />
      <Discover memberCount={memberCount} />
    </div>
  );
}
