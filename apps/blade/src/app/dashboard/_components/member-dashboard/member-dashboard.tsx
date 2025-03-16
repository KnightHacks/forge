import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { api } from "~/trpc/server";
import { MemberAppCard } from "../../../_components/option-cards";
import { EventNumber } from "./event/event-number";
import { EventShowcase } from "./event/event-showcase";
import { MemberInfo } from "./info";
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
            Hello, {member.firstName}
          </h2>
        </div>
        {/* Desktop View */}
        <div className="hidden space-y-4 md:grid">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Payment status={dues.value.duesPaid} />
            <Points size={member.points} />
            <EventNumber size={events.value.length} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <MemberInfo />
            <EventShowcase events={events.value} member={member} />
          </div>
        </div>
        {/* Mobile View */}
        <div className="space-y-4 md:hidden">
          <Payment status={dues.value.duesPaid} />
          <MemberInfo />
          <Points size={member.points} />
          <EventNumber size={events.value.length} />
          <EventShowcase events={events.value} member={member} />
        </div>
      </div>
    </div>
  );
}
