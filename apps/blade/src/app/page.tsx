import Image from "next/image";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { DiscordSignInLink } from "~/app/_components/auth/discord-sign-in-link";
import { auth } from "~/server/auth";

export default async function HomePage() {
  const session = await auth();

  if (session) redirect(MEMBER_DASHBOARD_PATH);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <section className="container relative z-10 grid min-h-[100svh] items-center gap-8 py-10 md:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.8fr)] md:py-14 lg:gap-12">
        <div className="space-y-7">
          <div className="flex items-center gap-3 text-white">
            <Image
              src="/white-kh-title-logo.svg"
              alt="Knight Hacks"
              width={2040}
              height={551}
              priority
              style={{ height: "45.35px", width: "168px" }}
            />
          </div>

          <div className="max-w-3xl space-y-5">
            <h1 className="text-4xl font-bold tracking-normal text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Everything Knight Hacks, in{" "}
              <span className="bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">
                one platform.
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              Manage your Knight Hacks membership, profile, and dashboard with
              Blade.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <DiscordSignInLink className="h-12 gap-2 px-6 text-base">
              Sign in with Discord
            </DiscordSignInLink>
            <div className="relative z-10 overflow-hidden rounded-md p-[1.5px]">
              <div className="moving-border absolute inset-0 bg-[conic-gradient(#0ea5e9_20deg,transparent_120deg)]" />
              <div className="relative z-20 rounded-md bg-secondary px-6 py-3 text-center text-base font-medium text-secondary-foreground">
                Member onboarding
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[20rem] sm:min-h-[26rem] md:min-h-[34rem]">
          <Image
            src="/tech-knight.png"
            alt="Tech Knight"
            fill
            priority
            sizes="(min-width: 768px) 44vw, 92vw"
            className="object-contain object-center"
          />
        </div>
      </section>
    </main>
  );
}
