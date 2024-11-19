import { auth, signIn, signOut } from "@blade/auth";
import { Button } from "@blade/ui/button";

export async function AuthButton() {
  const session = await auth();

  if (session) {
    return (
      <form>
        <Button
          formAction={async () => {
            "use server";
            await signOut();
          }}
        >
          Sign Out
        </Button>
      </form>
    );
  }

  return (
    <form>
      <Button
        formAction={async () => {
          "use server";
          await signIn("discord");
        }}
      >
        Sign In
      </Button>
    </form>
  );
}
