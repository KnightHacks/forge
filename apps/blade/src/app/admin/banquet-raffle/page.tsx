import { redirect } from "next/navigation";
import { eq, gt } from "drizzle-orm";

import { auth } from "@forge/auth";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import RaffleDraw from "~/app/_components/admin/banquet-raffle/raffle-draw";

export default async function Raffle() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["ADMIN_BANQUET_RAFFLE"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  const raffle_participants = await db
    .select({
      memberId: Member.id,
      firstName: Member.firstName,
      lastName: Member.lastName,
      points: Member.points,
    })
    .from(Member)
    .innerJoin(User, eq(Member.userId, User.id))
    .where(gt(Member.points, 100));

  // Create an array of entries, where each user is inserted a number of times equal to their points / 10
  const raffle_entries = [];
  for (const participant of raffle_participants) {
    for (let i = 0; i < participant.points / 10; i++) {
      raffle_entries.push(participant);
    }
  }

  return <RaffleDraw entries={raffle_entries} />;
}
