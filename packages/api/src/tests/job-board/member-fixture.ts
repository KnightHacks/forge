import { User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../../utils/db";

export async function insertJobBoardTestMember(
  db: WriteDb,
  discordUserId: string,
) {
  const [user] = await db
    .insert(User)
    .values({ discordUserId })
    .returning({ id: User.id });
  if (!user) throw new Error("Could not create the user fixture.");

  const [member] = await db
    .insert(Member)
    .values({
      userId: user.id,
      firstName: "Career",
      lastName: "Test",
      discordUser: "display-only",
      age: 20,
      email: `${user.id}@example.test`,
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate University (3+ year)",
      shirtSize: "M",
      dob: "2006-01-01",
      gradDate: "2027-05-01",
    })
    .returning({ id: Member.id });
  if (!member) throw new Error("Could not create the member fixture.");
  return member.id;
}
