// import { env } from "~/env";
// import About from "./_components/landing/about";
// import CalendarPage from "./_components/landing/calendar";
// import Discover from "./_components/landing/discover";
// import Hero from "./_components/landing/hero";
// import Impact from "./_components/landing/impact";
// import Sponsors from "./_components/landing/sponsors";
// import { api } from "./trpc/server";
// import { redirect } from "next/navigation";

// export default async function HomePage() {
//   const [events, memberCount] = await Promise.all([
//     api.event.getEvents.query(),
//     api.member.getMemberCount.query(),
//   ]);

//   return (
//     <main className="relative z-10 text-white">
//       <div className="bg-gradient-to-b from-purple-900 to-[#1d1a2e]">
//         <Hero bladeUrl={env.BLADE_URL} />
//       </div>
//       <div className="-mt-1 bg-gradient-to-b from-[#1d1a2e] to-[#24162e] pt-1 md:pb-64">
//         <About />
//       </div>
//       <div className="-mt-1 bg-gradient-to-b from-[#24162e] via-[#1c182b] to-[#12101c] pt-1 md:pb-64">
//         <Impact />
//       </div>
//       <div className="-mt-1 bg-gradient-to-b from-[#12101c] via-[#1d1530] to-[#281a37] pt-1 md:pb-64">
//         <Sponsors />
//       </div>
//       <div className="-mt-1 bg-gradient-to-b from-[#281a37] via-[#2a1c3c] to-[#1b112b] pt-1 md:pb-64">
//         <CalendarPage events={events} />
//       </div>
//       <div className="bg-gradient-to-b from-[#1b112b] to-[#4c1d95]">
//         <Discover memberCount={memberCount} />
//       </div>
//     </main>
//   );
// }

import React from "react";
import { Calendar, Users, Wrench } from "lucide-react";

import { env } from "../env";

const WIPPage = () => {
  return (
    <div className="overflow-hidden bg-gradient-to-br from-black via-black to-purple-950 px-4 py-12">
      <div className="absolute inset-0 opacity-25">
        <div className="absolute left-10 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-700 blur-3xl" />
        <div
          className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-purple-800 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-600 opacity-30" />
            <Wrench
              className="relative h-24 w-24 text-purple-400"
              style={{ filter: "drop-shadow(0 0 30px #a855f7)" }}
            />
          </div>

          <h1
            className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
            style={{
              textShadow:
                "0px 0px 40px #6B21A8, 0px 0px 20px #6B21A8, 0px 0px 10px #6B21A8",
            }}
          >
            Coming Soon
          </h1>

          <p className="mb-12 max-w-2xl text-xl text-gray-300 md:text-2xl">
            Our club site is currenty under construction. Register for Knight
            Hacks VIII or join our growing community.
          </p>

          <div className="flex w-full max-w-3xl flex-col gap-6 sm:flex-row">
            <a
              href="https://2025.knighthacks.org"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700/20 to-purple-900/20 p-[2px] transition-all duration-300 hover:scale-105"
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ filter: "blur(30px)" }}
              />
              <div className="relative flex items-center gap-6 rounded-2xl bg-gray-900 p-8 transition-all duration-300">
                <Calendar
                  className="h-16 w-16 flex-shrink-0 text-purple-400"
                  style={{ filter: "drop-shadow(0 0 25px #a855f7)" }}
                />
                <div className="flex-1 text-left">
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    Hackathon
                  </h2>
                  <p className="text-gray-400">
                    Join our upcoming hackathon and showcase your skills
                  </p>
                </div>
                <div className="flex items-center font-semibold text-purple-400">
                  <svg
                    className="h-6 w-6 transition-transform group-hover:translate-x-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </div>
            </a>
            <a
              href={env.BLADE_URL}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700/20 to-purple-900/20 p-[2px] transition-all duration-300 hover:scale-105"
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ filter: "blur(30px)" }}
              />
              <div className="relative flex items-center gap-6 rounded-2xl bg-gray-900 p-8 transition-all duration-300">
                <Users
                  className="h-16 w-16 flex-shrink-0 text-purple-400"
                  style={{ filter: "drop-shadow(0 0 25px #a855f7)" }}
                />
                <div className="flex-1 text-left">
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    Our Club
                  </h2>
                  <p className="text-gray-400">
                    Discover our community and what we're all about
                  </p>
                </div>
                <div className="flex items-center font-semibold text-purple-400">
                  <svg
                    className="h-6 w-6 transition-transform group-hover:translate-x-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </div>
            </a>
          </div>

          <div className="mt-16">
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-purple-400"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-purple-400"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
            <p className="mt-4 text-sm text-gray-500">Road Work Ahead</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WIPPage;
