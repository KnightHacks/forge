import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { api as serverCall } from "~/trpc/server";
import { HackerData } from "./hacker-data";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

export default function HackerDashboard({
  hacker,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  if (!hacker) {
    redirect("/hacker/application");
  }

  return (
    <div className="h-76 relative mx-auto flex w-[90%] max-w-[70rem] bg-[#E5E7EB] pb-5 pt-6 dark:bg-[#0A0F1D] sm:py-0 sm:pb-0 lg:h-56">
      {/* Main content */}
      <HackerData data={hacker} />

      {/* Transparent Triangle overlay in bottom right corner */}
      <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent"></div>

      {/* Triangle in bottom right corner */}
      <div
        className="absolute bottom-0 right-0 h-0 w-0"
        style={{
          borderBottom: "20px solid #6C26D9", // Change to bg color
          borderLeft: "20px solid transparent",
        }}
      ></div>

      {/* Top rectangle */}
      <div className="absolute -top-[1.4rem] right-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-96">
        <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
      </div>

      {/* Bottom rectangle */}
      <div className="absolute -bottom-[1.46rem] left-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-48">
        <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
      </div>

      {/* Left side rectangle */}
      <div className="absolute -left-3 top-0 h-full w-[0.4rem] bg-primary"></div>
    </div>
  );
}
