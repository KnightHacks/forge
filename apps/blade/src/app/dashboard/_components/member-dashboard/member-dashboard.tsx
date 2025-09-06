import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { MemberAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";
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
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <p className="w-full max-w-xl text-center">
          <div className="font-normal">
            Are you a UCF student?
            <br className="mb-2" />
            Are you passionate about the world of tech and want to take your
            skills to the next level?
            <br />
            <br />
          </div>
          Sign up to become a KnightHacks member today!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <MemberAppCard />
        </div>
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
      <div className="flex-1 space-y-4">
        <div className="mb-8 flex animate-fade-in items-center justify-between space-y-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Hello, {member.firstName}!
            </h2>
            <p className="text-muted-foreground">Member Dashboard</p>
          </div>
        </div>
        {/* Unified View */}
        <div className="animate-mobile-initial-expand space-y-4">
          <div className="grid animate-fade-in gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Payment status={dues.value.duesPaid} member={member} />
            <MemberInfo />
            <Points size={member.points} />
            <EventNumber size={events.value.length} />
          </div>
          <div className="animate-fade-in">
            <EventShowcase events={events.value} member={member} />
          </div>
        </div>
      </div>
    </div>
  );
}
