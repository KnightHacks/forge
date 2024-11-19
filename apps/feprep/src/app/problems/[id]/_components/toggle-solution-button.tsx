"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { RocketIcon } from "@blade/ui";
import { Button } from "@blade/ui/button";

export function ToggleSolutionButton() {
  const searchParams = useSearchParams();
  const pageNumber = Number(searchParams.get("page"));
  const pathname = usePathname();

  return (
    <Link href={`${pathname}?page=${pageNumber === 1 ? 2 : 1}`}>
      <Button variant="outline" className="w-9 px-0 lg:w-auto lg:px-4">
        <RocketIcon className="lg:mr-2" />
        <span className="hidden lg:inline">
          {pageNumber === 1 ? "Solution" : "Question"}
        </span>
      </Button>
    </Link>
  );
}
