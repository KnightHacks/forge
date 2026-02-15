import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeftIcon, cn } from "@forge/ui";
import { buttonVariants } from "@forge/ui/button";
import { Separator } from "@forge/ui/separator";

import { SidebarNav } from "~/app/_components/settings/sidebar-nav";
import { SIDEBAR_NAV_ITEMS } from "~/consts";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Blade | Settings",
  description: "Manage your Knight Hacks account settings.",
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <>
      <div className="space-y-6 p-10 pb-16 md:block">
        <Link
          href={"/dashboard"}
          className={cn(buttonVariants({ variant: "link" }), "!px-0")}
        >
          <ArrowLeftIcon className="mr-1" />
          Dashboard
        </Link>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and set e-mail preferences.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="lg:w-1/5">
            <SidebarNav items={SIDEBAR_NAV_ITEMS} />
          </aside>
          <div className="w-full">{children}</div>
        </div>
      </div>
    </>
  );
}
