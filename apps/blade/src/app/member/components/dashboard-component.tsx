import { auth, signIn } from "@forge/auth";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";

export default async function DashboardComponent() {
  const session = await auth();

  if (!session) {
    return (
      <form>
        <Button
          size="lg"
          formAction={async () => {
            "use server";
            await signIn("discord");
          }}
        >
          Sign in with Discord
        </Button>
      </form>
    );
  }

  // grabs the user's first name from the member table
  const member = await db
    .select({ firstName: Member.firstName })
    .from(Member)
    .where(eq(Member.userId, session.user.id))
    .limit(1);
  const memberFirstName = member[0]?.firstName;

  console.log("Welcome: " + memberFirstName);
  if (memberFirstName == undefined) {
    return (
      <div>
        <h1>You are not a member! Sign up to become one.</h1>
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <h1>Welcome {memberFirstName}!</h1>
    </div>
  );
}
