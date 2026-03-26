import { Auth } from "~/app/_components/auth-showcase";
import { HydrateClient } from "~/trpc/server";

export default function HomePage() {
  return (
    <HydrateClient>
      <main>
        <Auth />
      </main>
    </HydrateClient>
  );
}
