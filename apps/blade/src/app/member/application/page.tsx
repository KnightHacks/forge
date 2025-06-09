import { redirect } from "next/navigation";

import { auth, signIn } from "@forge/auth";

import { api } from "~/trpc/server";
import { MemberApplicationForm } from "./_components/member-application-form";

export default async function MemberApplicationPage() {
  const session = await auth();

  if (session == null) {
    async function signInAction() {
      "use server";
      await signIn("discord", { redirectTo: "/member/application" });
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
            <button type="submit">Continue to sign in</button>
          </form>
        </noscript>
      </>
    );
  }

  const isMember = await api.member.getMember();

  if (isMember) {
    return redirect("/dashboard");
  }

  return (
    <main className="px-8 py-4">
      <MemberApplicationForm />
    </main>
  );
}
