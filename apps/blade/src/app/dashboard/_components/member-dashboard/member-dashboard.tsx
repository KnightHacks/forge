import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { MemberAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";
import { AlumniDiscord } from "./AlumniDiscord";
import { EventNumber } from "./event/event-number";
import { EventShowcase } from "./event/event-showcase";
import { FormResponses } from "./forms/form-responses";
import { MemberInfo } from "./info";
import { Donate } from "./payment/donate";
import { Payment } from "./payment/payment-dues";
import { Points } from "./points";
import { useEffect } from "react";

export const metadata: Metadata = {
  title: "Member Dashboard",
  description: "The official Knight Hacks Member Dashboard",
};

interface Member {
  gradDate: Date | string;
  levelOfStudy: string;
}

// Calculate year of study based on graduation date relative to current date
const calcAlumniStatus = (gradDate: Date | string, member: Member): boolean => {
  // Convert gradDate to Date object if it's a string
  const gradDateObj =
    typeof gradDate === "string" ? new Date(gradDate) : gradDate;
  const currentDate = new Date();

  // Check if dates are valid
  if (isNaN(gradDateObj.getTime())) return false;

  const gradYear = gradDateObj.getFullYear();
  const currentYear = currentDate.getFullYear();
  const yearsUntilGrad = gradYear - currentYear;

  if (
    member.levelOfStudy === "Less than Secondary / High School" ||
    member.levelOfStudy === "Secondary / High School"
  ) {
    if (yearsUntilGrad < -4) return true;
    return false;
  }

  // Check for graduate students (Masters, PhD, etc.)
  if (
    member.levelOfStudy ===
      "Graduate University (Masters, Professional, Doctoral, etc)" ||
    member.levelOfStudy === "Post Doctorate"
  ) {
    return false;
  }

  // If graduation date has passed, they are alumni
  if (yearsUntilGrad < 0) return true;

  // Current year graduates are still seniors until they actually graduate
  return false;
};

export default async function MemberDashboard({
  member,
}: {
  member: Awaited<ReturnType<(typeof serverCall.member)["getMember"]>>;
}) {
  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <div className="w-full max-w-xl text-center">
          <div className="font-normal">
            Are you a UCF student?
            <br className="mb-2" />
            Are you passionate about the world of tech and want to take your
            skills to the next level?
            <br />
            <br />
          </div>
          Sign up to become a KnightHacks member today!
        </div>
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

  const isAlumni = calcAlumniStatus(member.gradDate, member);

	events.value.forEach(async (e) => {
		await api.event.ensureForm({ eventId: e.id });
	});

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4">
        <div className="animate-fade-in mb-8 flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Hello, {member.firstName}!
            </h2>
            <p className="text-muted-foreground">
              {`${isAlumni ? "Alumni" : "Member"}`} Dashboard
            </p>
          </div>
        </div>
        {/* Unified View */}
        <div className="animate-mobile-initial-expand space-y-4">
          <div className="animate-fade-in grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isAlumni ? (
              <Donate />
            ) : (
              <Payment status={dues.value.duesPaid} member={member} />
            )}

            <MemberInfo />

            {isAlumni ? <AlumniDiscord /> : <Points size={member.points} />}

            <EventNumber size={events.value.length} />

            <div className="lg:col-span-1">
              <FormResponses />
            </div>

            <div className="lg:col-span-3">
              <EventShowcase events={events.value} member={member} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
