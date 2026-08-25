"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useHackerApplication,
  usePublicHackathon,
} from "@forge/hacker-sdk/react";

import { HackerFormPage } from "../_components/application/hacker-application-form";

export default function ApplyPage() {
  const router = useRouter();
  const hackathon = usePublicHackathon();
  const application = useHackerApplication();

  useEffect(() => {
    if (application.data?.application) router.replace("/dashboard");
  }, [application.data?.application, router]);

  if (hackathon.isPending || application.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] text-[#d7ff76]">
        <p className="text-sm font-bold uppercase tracking-[0.18em]">
          Preparing your application…
        </p>
      </main>
    );
  }

  if (!hackathon.data || hackathon.isError || application.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] px-4 text-white">
        <section className="bg-[#07150f]/82 w-full max-w-xl rounded-lg border border-white/20 p-8 shadow-2xl">
          <h1 className="text-3xl font-black">Application unavailable</h1>
          <p className="text-white/78 mt-4">
            Refresh the page or try again in a moment.
          </p>
        </section>
      </main>
    );
  }

  const now = new Date();
  const opensAt = new Date(hackathon.data.applicationOpen);
  const closesAt = new Date(hackathon.data.applicationDeadline);
  if (now < opensAt || now > closesAt) {
    const beforeOpen = now < opensAt;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] bg-[url('https://assets.knighthacks.org/khix-flat.webp')] bg-cover bg-center px-4 py-10 text-white">
        <section className="bg-[#07150f]/82 w-full max-w-xl rounded-lg border border-white/20 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d7ff76]">
            Knight Hacks IX applications
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Applications are {beforeOpen ? "not open yet" : "closed"}.
          </h1>
          <p className="text-white/78 mt-4 leading-7">
            {beforeOpen
              ? `Applications open ${opensAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}.`
              : "Join the Knight Hacks Discord for future event and registration updates."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#d7ff76] px-5 py-2 font-bold text-[#0f2418]"
          >
            Back to Knight Hacks IX
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      {(application.data.profileIssues?.length ?? 0) > 0 ? (
        <aside className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-xl rounded-lg border border-[#d7ff76]/50 bg-[#07150f]/95 p-4 text-sm leading-6 text-white shadow-2xl backdrop-blur-md">
          <strong className="block text-[#d7ff76]">
            Your saved profile needs an update
          </strong>
          Re-enter the missing profile details below before submitting your
          application.
        </aside>
      ) : null}
      <HackerFormPage
        applicationBackgroundKey="khix"
        hackathonId={hackathon.data.id}
        hackathonName={hackathon.data.displayName}
        hackathonStartDate={hackathon.data.startDate}
      />
    </>
  );
}
