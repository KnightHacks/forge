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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";

import { api } from "~/trpc/react";

export function UserDropdown() {
  const router = useRouter();
  const { data } = api.user.getUserAvatar.useQuery();

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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Profiles</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => router.push("/settings")}>
                  <span>Member</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <span>Hacker</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
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
