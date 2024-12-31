"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@forge/ui";
import { buttonVariants } from "@forge/ui/button";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          replace
          key={item.title}
          href={item.href}
          scroll={true}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href &&
              item.title !== "Hacker Profile (coming soon)"
              ? "bg-muted !text-primary hover:bg-muted"
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
