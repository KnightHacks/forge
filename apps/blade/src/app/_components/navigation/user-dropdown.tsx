"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import type { PermissionKey } from "@forge/consts/knight-hacks";
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
  adminItems,
  clubItems,
  hackathonItems,
  systemItems,
  userItems,
} from "./reusable-user-dropdown";

interface UserDropdownProps {
  permissions: Record<PermissionKey, boolean>;
}

/**
 * Filters role items based on user permissions
 */
function filterItemsByPermissions(
  items: roleItems[],
  permissions: Record<PermissionKey, boolean>,
): roleItems[] {
  return items.filter((item) => {
    // If no permissions required, show the item
    if (!item.requiredPermissions) return true;

    const { or, and } = item.requiredPermissions;

    // Check OR permissions - user needs at least one
    if (or && or.length > 0) {
      const hasOrPermission = or.some((perm) => permissions[perm]);
      if (!hasOrPermission) return false;
    }

    // Check AND permissions - user needs all of them
    if (and && and.length > 0) {
      const hasAllAndPermissions = and.every((perm) => permissions[perm]);
      if (!hasAllAndPermissions) return false;
    }

    return true;
  });
}

export function UserDropdown({ permissions }: UserDropdownProps) {
  const utils = api.useUtils();
  const router = useRouter();
  const { data } = api.user.getUserAvatar.useQuery();

  void utils.member.getMember.prefetch();

  // Filter items based on user permissions
  const filteredAdminItems = filterItemsByPermissions(adminItems, permissions);
  const filteredSystemItems = filterItemsByPermissions(
    systemItems,
    permissions,
  );
  const filteredClubItems = filterItemsByPermissions(clubItems, permissions);
  const filteredHackathonItems = filterItemsByPermissions(
    hackathonItems,
    permissions,
  );

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
      <DropdownMenuContent className="mr-4 max-h-[75vh] w-screen overflow-y-auto sm:max-h-[80vh] sm:w-56">
        <DropdownMenuLabel>{data ? data.name : "My Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {filteredAdminItems.length > 0 && (
            <DropdownMenuRoleItems items={filteredAdminItems} />
          )}
          {filteredSystemItems.length > 0 && (
            <>
              <DropdownMenuLabel>System</DropdownMenuLabel>
              <DropdownMenuRoleItems items={filteredSystemItems} />
            </>
          )}
          {filteredClubItems.length > 0 && (
            <>
              <DropdownMenuLabel>Club</DropdownMenuLabel>
              <DropdownMenuRoleItems items={filteredClubItems} />
            </>
          )}
          {filteredHackathonItems.length > 0 && (
            <>
              <DropdownMenuLabel>Hackathon</DropdownMenuLabel>
              <DropdownMenuRoleItems items={filteredHackathonItems} />
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
