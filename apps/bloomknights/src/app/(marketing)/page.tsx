import { auth } from "~/auth/server";
import { HomePageClient } from "./home-page-client";

export default async function HomePage() {
  const session = await auth();
  const isSignedIn = Boolean(session);

  return (
    <HomePageClient
      registerHref={isSignedIn ? "/dashboard" : "/apply"}
      registerLabel={isSignedIn ? "Go to Dashboard" : "Register Now!"}
    />
  );
}
