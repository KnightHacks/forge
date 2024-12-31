import Image from "next/image";

import { signIn } from "@forge/auth";
import { Button } from "@forge/ui/button";
import { Separator } from "@forge/ui/separator";

export function AuthShowcase() {
  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <div className="absolute left-0 top-0 flex items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
        <div className="flex items-center justify-center gap-x-2 text-lg font-extrabold sm:text-[2rem]">
          <Image
            src={"/gold-kh-logo.svg"}
            alt="The logo of Knight Hacks"
            width={0}
            height={0}
            style={{ width: "35px", height: "35px" }}
          />
          Blade
        </div>
      </div>
      <Separator className="absolute top-16 sm:top-20" />
      <h1 className="mb-2 w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem] md:w-[600px]">
        Everything Knight Hacks. All-in-one platform.
      </h1>
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
    </div>
  );
}
