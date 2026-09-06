"use client";

import { startTransition } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import {
  RouteTransitionLink as Link,
  useNavigationRouter as useRouter,
} from "~/app/_components/shared/route-transition-link";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { ClubClassificationSection } from "./club-classification-section";
import { DiscordConfigSection } from "./discord-config-section";

export function AdminConfigConsole({
  clubTeams,
  discord,
}: {
  clubTeams: RouterOutputs["clubTeams"]["listConfiguration"];
  discord: RouterOutputs["discordConfig"]["list"];
}) {
  const router = useRouter();
  // The data arrived as RSC props, so there is no query cache to invalidate.
  const refresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    // Four direct children on purpose. `adminPageLayoutClassName` ends in
    // `space-y-4 sm:space-y-6`, which compiles to `> * + *`: grouping the two
    // sections under a wrapper would delete a gap with no type, lint or test
    // failure.
    <main className={adminPageLayoutClassName}>
      <Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">
        <Link href="/admin/roles">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Roles
        </Link>
      </Button>
      <AdminPageHeader
        description="Edit the Discord settings the platform resolves at runtime, and decide how each Blade role appears on the public Club roster. Keys and teams are code and migration concerns, so neither can be added or removed here."
        eyebrow={ADMIN_PAGE_EYEBROWS.rolesConfig}
        icon={SlidersHorizontal}
        title="Platform configuration"
      />
      <DiscordConfigSection
        environment={discord.environment}
        onSaved={refresh}
        rows={discord.rows}
      />
      <ClubClassificationSection
        onSaved={refresh}
        roles={clubTeams.roles}
        teams={clubTeams.teams}
      />
    </main>
  );
}
