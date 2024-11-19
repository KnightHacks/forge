import Link from "next/link";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ListBulletIcon,
  ShuffleIcon,
} from "@blade/ui";
import { Button } from "@blade/ui/button";
import { Separator } from "@blade/ui/separator";

import { AuthButton } from "./auth-button";
import { TimerButton } from "./timer-button";
import { ToggleSolutionButton } from "./toggle-solution-button";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Link href="/problems" className="text-xl font-bold">
          <span>FEPrep</span>
        </Link>
        <Separator orientation="vertical" className="mx-2 h-8" />
        <div className="flex items-center">
          <Button
            variant="outline"
            className="w-9 rounded-r-none px-0 focus-visible:bg-accent focus-visible:ring-0 lg:w-auto lg:px-4"
          >
            <ListBulletIcon className="lg:mr-2" />
            <span className="hidden lg:inline">Questions</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-l-none rounded-r-none border-l-0 focus-visible:bg-accent focus-visible:ring-0"
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-l-none rounded-r-none border-l-0 focus-visible:bg-accent focus-visible:ring-0"
          >
            <ArrowRightIcon />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-l-none border-l-0 focus-visible:bg-accent focus-visible:ring-0"
          >
            <ShuffleIcon />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <TimerButton />
        <ToggleSolutionButton />
      </div>
      <div className="flex items-center">
        <AuthButton />
      </div>
    </nav>
  );
}
