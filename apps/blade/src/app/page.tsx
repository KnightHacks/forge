import Application from "./anthony_calabrese/page";

export default function HomePage() {
  return (
    <>
      <Application />
    </>
  );
}

/*

import { HydrateClient } from "~/trpc/server";
import { Auth } from "./_components/auth-showcase";

<HydrateClient>
      <main className="container h-screen py-16">
        <Auth />
      </main>
    </HydrateClient>
    */
