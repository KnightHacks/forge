import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ChartPie,
  FormInput,
  Hotel,
  Settings,
  ShieldCheck,
  Swords,
  TicketCheck,
  User,
  Users,
} from "lucide-react";

import { auth } from "@forge/auth";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Admin",
  description: "Manage Knight Hacks as an administrator.",
};

export default async function Admin() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const perms = await api.roles.getPermissions();

  // Check if user has any admin permissions
  const hasAnyAdminAccess = Object.entries(perms).some(([key, value]) => {
    if (key === "IS_OFFICER") return value;
    return value && key !== "IS_JUDGE";
  });

  if (!hasAnyAdminAccess) {
    redirect("/");
  }

  const user = await api.member.getMember();

  // Define sections with their permission requirements
  const sections = [
    {
      title: "Club Management",
      description: "Manage club members, events, and data",
      icon: User,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      items: [
        {
          href: "/admin/club/members",
          label: "Members",
          icon: User,
          show: perms.READ_MEMBERS || perms.EDIT_MEMBERS || perms.IS_OFFICER,
        },
        {
          href: "/admin/club/events",
          label: "Events",
          icon: CalendarDays,
          show:
            perms.READ_CLUB_EVENT || perms.EDIT_CLUB_EVENT || perms.IS_OFFICER,
        },
        {
          href: "/admin/club/check-in",
          label: "Check-in",
          icon: TicketCheck,
          show: perms.CHECKIN_CLUB_EVENT || perms.IS_OFFICER,
        },
        {
          href: "/admin/club/data",
          label: "Analytics",
          icon: ChartPie,
          show: perms.READ_CLUB_DATA || perms.IS_OFFICER,
        },
      ],
    },
    {
      title: "Hackathon",
      description: "Manage hackers, events, and assignments",
      icon: Swords,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      items: [
        {
          href: "/admin/hackathon/hackers",
          label: "Hackers",
          icon: Swords,
          show: perms.READ_HACKERS || perms.EDIT_HACKERS || perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/events",
          label: "Events",
          icon: CalendarDays,
          show:
            perms.READ_HACK_EVENT || perms.EDIT_HACK_EVENT || perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/check-in",
          label: "Check-in",
          icon: TicketCheck,
          show: perms.CHECKIN_HACK_EVENT || perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/data",
          label: "Analytics",
          icon: ChartPie,
          show: perms.READ_HACK_DATA || perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/roomAssignment",
          label: "Room Assignment",
          icon: Hotel,
          show: perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/judge-assignment",
          label: "Judge Assignment",
          icon: Users,
          show: perms.IS_JUDGE || perms.IS_OFFICER,
        },
        {
          href: "/admin/hackathon/control-room",
          label: "Control Room",
          icon: AlertCircle,
          show: perms.IS_OFFICER,
        },
      ],
    },
    {
      title: "System",
      description: "Forms, emails, and role management",
      icon: Settings,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      items: [
        {
          href: "/admin/forms",
          label: "Forms",
          icon: FormInput,
          show: perms.READ_FORMS || perms.EDIT_FORMS || perms.IS_OFFICER,
        },
        {
          href: "/admin/roles/configure",
          label: "Configure Roles",
          icon: Settings,
          show: perms.CONFIGURE_ROLES || perms.IS_OFFICER,
        },
        {
          href: "/admin/roles/manage",
          label: "Assign Roles",
          icon: ShieldCheck,
          show: perms.ASSIGN_ROLES || perms.IS_OFFICER,
        },
      ],
    },
  ];

  // Filter sections to only show those with at least one visible item
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.show),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <HydrateClient>
      <div className="container mx-auto space-y-8 p-6 pb-16 lg:pt-40">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, {user?.firstName ?? "Admin"}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with Knight Hacks today.
          </p>
        </div>

        {/* Main Navigation Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => (
            <Card key={section.title} className="overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${section.bgColor}`}>
                    <section.icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 p-4">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HydrateClient>
  );
}
