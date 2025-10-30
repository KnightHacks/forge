"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { signOut } from "@forge/auth";

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

import type { roleItems } from "./reusable-user-dropdown";
import { USER_DROPDOWN_ICON_COLOR, USER_DROPDOWN_ICON_SIZE } from "~/consts";
import { api } from "~/trpc/react";
import {
  adminClubItems,
  adminHackathonItems,
  adminItems,
  scannerOnlyClubItems,
  scannerOnlyHackathonItems,
  userItems,
} from "./reusable-user-dropdown";

interface UserDropdownProps {
  hasCheckIn: boolean;
  hasFullAdmin: boolean;
}

export function UserDropdown({ hasCheckIn, hasFullAdmin }: UserDropdownProps) {
  const utils = api.useUtils();
  const router = useRouter();
  const { data } = api.user.getUserAvatar.useQuery();

  void utils.member.getMember.prefetch();

  const canAccessClub = hasFullAdmin || hasCheckIn;
  const canAccessHackathon = hasFullAdmin || hasCheckIn;
  const canAccessAdmin = hasFullAdmin || hasCheckIn;

  // Determine which items to show based on permissions
  const clubItems = hasFullAdmin
    ? adminClubItems
    : hasCheckIn
      ? scannerOnlyClubItems
      : [];
  const hackathonItems = hasFullAdmin
    ? adminHackathonItems
    : hasCheckIn
      ? scannerOnlyHackathonItems
      : [];

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
          {canAccessAdmin && <DropdownMenuRoleItems items={adminItems} />}
          {canAccessClub && clubItems.length > 0 && (
            <>
              <DropdownMenuLabel>Club</DropdownMenuLabel>
              <DropdownMenuRoleItems items={clubItems} />
            </>
          )}
          {canAccessHackathon && hackathonItems.length > 0 && (
            <>
              <DropdownMenuLabel>Hackathon</DropdownMenuLabel>
              <DropdownMenuRoleItems items={hackathonItems} />
            </>
          )}
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
