"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";

import type { roleItems } from "./reuseable-user-dropdown";
import { USER_DROPDOWN_ICON_COLOR, USER_DROPDOWN_ICON_SIZE } from "~/consts";
import { api } from "~/trpc/react";
import { adminItems, userItems } from "./reuseable-user-dropdown";

// If you need to conditionally render some dropdown items, please refer to ./reuseable-user-dropdown

export function UserDropdown({ isAdmin }: { isAdmin: boolean }) {
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
      <DropdownMenuContent className="mr-4 w-screen sm:w-56">
        <DropdownMenuLabel>{data ? data.name : "My Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isAdmin && <DropdownMenuRoleItems items={adminItems} />}
          <DropdownMenuItem
            className="gap-x-1.5"
            onSelect={() => router.push("/dashboard")}
          >
            <LayoutDashboard
              color={USER_DROPDOWN_ICON_COLOR}
              size={USER_DROPDOWN_ICON_SIZE}
            />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuRoleItems items={userItems} />
        </DropdownMenuGroup>
        {/* Made signing out client-side due to dropdown item keyboard accessibility issues */}
        <DropdownMenuItem onSelect={() => signOut()}>
          <Button type="submit">Sign out</Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownMenuRoleItems({ items }: { items: roleItems[] }) {
  const router = useRouter();
  return (
    <>
      {items.map((elem, index) => (
        <DropdownMenuItem
          key={index}
          className="gap-x-1.5"
          onSelect={() => router.push(elem.route)}
        >
          {elem.component}
          <span>{elem.name}</span>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
    </>
  );
}
