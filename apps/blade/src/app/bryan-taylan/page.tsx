import type { Metadata } from "next";

import { HydrateClient } from "~/trpc/server";
import { SessionNavbar } from "../_components/navigation/session-navbar";
import { ResumeContent } from "./_components/resume-content";

export const metadata: Metadata = {
  title: "Blade | Resume",
  description: "Professional resume and portfolio showcase.",
};

export default function ResumePage() {

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="container py-16">
        <div className="mx-auto max-w-4xl">
          <ResumeContent />
        </div>
      </main>
    </HydrateClient>
  );
}
