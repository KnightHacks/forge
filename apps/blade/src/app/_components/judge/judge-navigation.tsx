"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Menu, Trophy, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="mb-6">
      <CardContent className="p-3 sm:p-4">
        {/* Mobile header with menu toggle */}
        <div className="flex items-center justify-between sm:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2 transition-colors hover:bg-gray-100"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {isOpen && (
          <nav className="mt-3 flex flex-col gap-2 sm:hidden">
            {judgeNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant={isActive ? "primary" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2 transition-colors",
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
        )}

        {/* Desktop layout */}
        <div className="hidden flex-col gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Main Site
            </Button>
          </Link>

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
