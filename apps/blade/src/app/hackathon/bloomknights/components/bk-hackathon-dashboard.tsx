import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

import type { api as serverCall } from "~/trpc/server";
import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";

type BKHackathonHacker = Awaited<
  ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>
>;

const BK_HACKER_GUIDE_HREF =
  "https://knight-hacks.notion.site/knight-hacks-viii";

export function BKHackathonDashboard({
  hackathon,
  hacker,
}: {
  hackathon: SelectHackathon;
  hacker: BKHackathonHacker;
}) {
  return (
    <BaseHackathonDashboard
      guideHref={BK_HACKER_GUIDE_HREF}
      hackathon={hackathon}
      hacker={hacker}
    />
  );
}
