import MemberDashboard from "~/app/_components/dashboard/member-dashboard/member-dashboard";
import { MemberAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";

export async function UserInterface() {
  const member = await api.member.getMember();

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 font-bold">
        <p className="w-full max-w-xl text-center">
          You have not applied to be a Knight Hacks member yet. Please fill out
          an application below to get started!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <MemberAppCard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="max-w-8xl w-full">
        <MemberDashboard member={member} />
      </div>
    </div>
  );
}
