import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@forge/ui/button";

import { USER_DROPDOWN_ICON_SIZE } from "~/consts";

export function AuthHome() {
  return (
    <div className="mt-28 flex h-full w-full flex-col items-center px-2 sm:mt-0 sm:justify-center">
      <h1 className="w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">
        Welcome to Blade!
      </h1>
      <p className="text-md mb-5 text-center tracking-tighter sm:text-lg">
        Manage your Knight Hacks membership, hackathon information, and more
        with <b>Blade</b>.
      </p>
      <Link href={"/dashboard"}>
        <Button size="lg">
          <LayoutDashboard color={"#fff"} size={USER_DROPDOWN_ICON_SIZE} />{" "}
          <span className="ml-1">Open Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
