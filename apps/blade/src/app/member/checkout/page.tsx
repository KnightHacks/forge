import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { CheckoutForm } from "~/app/_components/dashboard/member/checkout-form";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Pay Dues",
  description: "Pay your Knight Hacks membership dues.",
};

export default async function CheckoutPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const dues = await api.duesPayment.validatePaidDues();
  if (dues.duesPaid) {
    redirect("/dashboard");
  }

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="container py-16">
        <CheckoutForm />
      </main>
    </HydrateClient>
  );
}
