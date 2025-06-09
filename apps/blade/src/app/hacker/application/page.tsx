import { redirect } from "next/navigation";

import { auth, signIn } from "@forge/auth";

import { api } from "~/trpc/server";
import { HackerFormPage } from "./_components/hacker-application-form";

export default async function HackerApplicationPage() {
  const session = await auth();

  if (session == null) {
    async function signInAction() {
      "use server";
      await signIn("discord", { redirectTo: "/hacker/application" });
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

  const isHacker = await api.hacker.getHacker();

  if (isHacker) {
    return redirect("/dashboard");
  }

  return (
    <main className="px-8 py-4">
      <HackerFormPage />
    </main>
  );
}
