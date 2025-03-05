import Image from "next/image";
import Link from "next/link";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

import { signIn } from "@forge/auth";
import { Button } from "@forge/ui/button";

export function Hero() {
  return (
    <div className="dark:bg-dark relative h-screen w-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 hidden bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] dark:block"></div>
      <div className="absolute inset-0 block h-full w-full bg-white bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:hidden"></div>
      <section className="h-full w-full bg-background py-20 md:py-32 lg:py-36">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            {/* Left column: Text content */}
            <div className="relative z-50 flex flex-col space-y-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Everything Knight Hacks, in{" "}
                <p className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  one platform.
                </p>
              </h1>
              <p className="max-w-prose text-lg text-muted-foreground sm:text-xl">
                Manage your Knight Hacks membership, hackathon information, and
                more with <b>Blade</b>.
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <form className="p-[1.5px]">
                  <Button
                    size="lg"
                    formAction={async () => {
                      "use server";
                      await signIn("discord", {
                        redirectTo: "/dashboard",
                      });
                    }}
                  >
                    Sign in with <DiscordLogoIcon className="ml-1" />
                  </Button>
                </form>
                <Link href={"/sponsor"}>
                  <div className="relative z-10 flex max-w-max cursor-pointer items-center overflow-hidden rounded-md p-[1.5px]">
                    <div className="moving-border absolute inset-0 h-full rounded-md bg-[conic-gradient(#0ea5e9_20deg,transparent_120deg)]"></div>
                    <div className="relative z-20 flex">
                      <Button
                        variant="secondary"
                        className="hover:bg-[#E6E7E9] dark:hover:bg-[#2C3644]"
                        size="lg"
                      >
                        Sponsor us!
                      </Button>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right column: Image */}
            <div className="relative h-[25rem] w-full overflow-hidden rounded-lg sm:h-[32rem]">
              <Image
                src="/tech-knight.png"
                alt="Hero image"
                fill
                style={{ objectFit: "contain" }}
                priority
                sizes="100%"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
