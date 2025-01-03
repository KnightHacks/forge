import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { api } from "~/trpc/server";
import { MemberAppCard } from "../option-cards";
import { EventNumber } from "./event/event-number";
import { EventShowcase } from "./event/event-showcase";
import { Payment } from "./payment/payment-dues";
import { Points } from "./points";

export const metadata: Metadata = {
  title: "Member Dashboard",
  description: "The official Knight Hacks Member Dashboard",
};

export default async function MemberDashboard({
  member,
}: {
  member: Awaited<ReturnType<(typeof serverCall.member)["getMember"]>>;
}) {
  if (!member) {
    return (
      <div className="mt-10 flex items-center justify-center">
        <MemberAppCard />
      </div>
    );
  }

  const [events, dues] = await Promise.allSettled([
    api.member.getEvents(),
    api.duesPayment.validatePaidDues(),
  ]);

  if (events.status === "rejected" || dues.status === "rejected") {
    return (
      <div className="mt-10 flex flex-col items-center justify-center gap-y-6 font-bold">
        Something went wrong. Please try again later.
      </div>
    );
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome, {member.firstName}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EventNumber size={events.value.length} />
          <Points size={member.points} />
          <Payment status={dues.value.duesPaid} />
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          <EventShowcase events={events.value} />
        </div>
      </div>
    </div>
  );
}
