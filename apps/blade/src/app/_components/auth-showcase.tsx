import Image from "next/image";
import Link from "next/link";

import { auth, signIn } from "@forge/auth";
import { Button } from "@forge/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { api } from "~/trpc/server";
import { UserDropdown } from "./navigation/user-dropdown";

export async function Auth() {
  const session = await auth();

  let member;

  if (session) {
    member = await api.member.getMember();
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="absolute left-0 top-0 flex w-full items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
          <div className="flex w-full items-center justify-start gap-x-2 text-lg font-extrabold sm:text-[2rem]">
            <Image
              src={"/white-kh-logo.svg"}
              alt="The logo of Knight Hacks"
              width={0}
              height={0}
              style={{ width: "35px", height: "35px" }}
            />
            Blade
          </div>
          {session && (
            <NavigationMenu className="h-[35px] w-[35px]">
              <NavigationMenuList>
                <NavigationMenuItem className="flex items-center justify-center">
                  <UserDropdown memberExists={!!member} />
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
        <Separator className="absolute top-16 sm:top-20" />
        <h1 className="mb-2 w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem] md:w-[600px]">
          Everything Knight Hacks. All-in-one platform.
        </h1>
        {!session ? (
          <form>
            <Button
              size="lg"
              formAction={async () => {
                "use server";
                await signIn("discord", { redirectTo: "/dashboard" });
              }}
            >
              Sign in with Discord
            </Button>
          </form>
        ) : (
          <Link href={"/dashboard"}>
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
