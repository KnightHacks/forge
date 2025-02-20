import { HydrateClient } from "~/trpc/server";
import { Auth } from "./_components/auth-showcase";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16 theme-container">
        <Auth />
      </main>
    </HydrateClient>
  );
}
