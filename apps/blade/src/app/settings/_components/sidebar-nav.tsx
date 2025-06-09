"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@forge/ui";
import { buttonVariants } from "@forge/ui/button";

import { api } from "~/trpc/react";
import { PERMANENT_DISCORD_INVITE } from "@forge/consts/knight-hacks";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  const { data: member, isLoading: memberLoading } =
    api.member.getMember.useQuery(undefined, { staleTime: Infinity });
  const { data: hacker, isLoading: hackerLoading } =
    api.hacker.getHacker.useQuery(undefined, { staleTime: Infinity });

  if (memberLoading || hackerLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!member && !hacker) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm">
        You have not signed up as a Knight Hacks Member or Hacker yet. For
        inquiries on registration, feel free to reach out in our{" "}
        <Link
          href={PERMANENT_DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Discord
        </Link>
        !
      </div>
    );
  }

  const visibleItems = items.filter((item) => {
    if (item.title.toLowerCase().includes("member")) return !!member;
    if (item.title.toLowerCase().includes("hacker")) return !!hacker;
    return true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className,
      )}
      {...props}
    >
      {visibleItems.map((item) => (
        <Link
          replace
          key={item.title}
          href={item.href}
          scroll
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-purple-50 !text-primary hover:bg-purple-50 dark:bg-purple-900/20 dark:hover:bg-purple-900/20"
              : "hover:bg-transparent hover:underline",
            "justify-start",
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
