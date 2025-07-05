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
  } catch (error) {
    console.error("Error checking hacker status:", error);
    return redirect("/dashboard");
  }

  const hackathon = await api.hackathon.getHackathon({
    hackathonName: params["hackathon-id"],
  });

  if (hackathon == null) {
    return redirect("/dashboard");
  }

  return (
    <main className="px-8 py-4">
      <HackerFormPage
        hackathonId={params["hackathon-id"]}
        hackathonName={hackathon.displayName}
      />
    </main>
  );
}
