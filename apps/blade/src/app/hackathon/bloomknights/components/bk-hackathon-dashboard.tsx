import type { api as serverCall } from "~/trpc/server";
import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";

type BKHackathonHacker = Awaited<
  ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>
>;

const BK_HACKER_GUIDE_HREF =
  "https://knight-hacks.notion.site/knight-hacks-viii";

export function BKHackathonDashboard({
  hacker,
}: {
  hacker: BKHackathonHacker;
}) {
  return (
    <BaseHackathonDashboard guideHref={BK_HACKER_GUIDE_HREF} hacker={hacker} />
  );
}
