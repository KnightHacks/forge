import { HydrateClient } from "~/trpc/server";
import { Auth } from "~/app/_components/auth-showcase";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <Auth />
      </main>
    </HydrateClient>
  );
}
