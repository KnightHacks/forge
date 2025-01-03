"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Button } from "@forge/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";

import { api } from "~/trpc/react";

export function UserDropdown() {
  const utils = api.useUtils();
  const router = useRouter();
  const { data } = api.user.getUserAvatar.useQuery();

  void utils.member.getMember.prefetch();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Needed a button with no styles for accessibility */}
        <button className="cursor-pointer select-none rounded-full transition ease-in-out hover:ring-8 hover:ring-secondary data-[state=open]:ring-2 data-[state=open]:ring-primary">
          <Avatar>
            <AvatarImage src={`${data ? data.avatar : ""}`} />
            <AvatarFallback></AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-screen sm:w-56">
        <DropdownMenuLabel>{data ? data.name : "My Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <span>Member Profile</span>
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Made signing out client-side due to dropdown item keyboard accessibility issues */}
        <DropdownMenuItem onSelect={() => signOut()}>
          <Button type="submit">Sign out</Button>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
