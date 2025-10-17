"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Trophy } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";

const judgeNavItems = [
  {
    name: "Home",
    href: "/judge",
    icon: Home,
    description: "Judge portal home",
  },
  {
    name: "Dashboard",
    href: "/judge/dashboard",
    icon: LayoutDashboard,
    description: "View and judge projects",
  },
  {
    name: "Results",
    href: "/judge/results",
    icon: Trophy,
    description: "View judging results",
  },
];

export function JudgeNavigation() {
  const pathname = usePathname();

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Back to main site */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Main Site
              </Button>
            </Link>
          </div>

          {/* Judge navigation */}
          <nav className="flex gap-2">
            {judgeNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "link" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </CardContent>
    </Card>
  );
}
