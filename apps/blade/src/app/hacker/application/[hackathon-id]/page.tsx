import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@forge/auth";

import { api } from "~/trpc/server";
import { HackerFormPage } from "../_components/hacker-application-form";

export default async function HackerApplicationPage({
  params,
}: {
  params: { "hackathon-id": string };
}) {
  const session = await auth();

  if (session == null) {
    async function signInAction() {
      "use server";
      await signIn("discord", {
        redirectTo: `/hacker/application/${params["hackathon-id"]}`,
      });
    }

    return (
      <>
        <form id="auto-sign-in" action={signInAction} />
        <script
          dangerouslySetInnerHTML={{
            __html: "document.getElementById('auto-sign-in').requestSubmit();",
          }}
        />
        <noscript>
          <form action={signInAction}>
            <button type="submit">Continue to Discord sign‑in</button>
          </form>
        </noscript>
      </>
    );
  }

  try {
    const isHacker = await api.hacker.getHacker({
      hackathonName: params["hackathon-id"],
    });

    if (isHacker != null) {
      return redirect("/dashboard");
    }
  } catch {
    return redirect("/dashboard");
  }

  const hackathon = await api.hackathon.getHackathon({
    hackathonName: params["hackathon-id"],
  });

  if (hackathon == null) {
    return redirect("/dashboard");
  }

  if (hackathon.applicationDeadline < new Date()) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">
            The application deadline for {hackathon.displayName} has passed.
          </h1>
          <p className="text-sm text-gray-500">
            Stay on the lookout for the next Hackathon by joining our{" "}
            <Link
              href="https://discord.gg/blade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Discord
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="px-8 py-4">
      <HackerFormPage
        hackathonId={params["hackathon-id"]}
        hackathonName={hackathon.displayName}
        hackathonStartDate={hackathon.startDate.toISOString()}
      />
    </main>
  );
}
