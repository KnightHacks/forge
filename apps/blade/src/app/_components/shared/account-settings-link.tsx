import Link from "next/link";

import { Button } from "@forge/ui/button";

import { settingsNavigationItem } from "./admin-navigation";

/**
 * Header account control for members without admin destinations (R-02).
 * R-03 should revisit rendering this for admins once Settings leaves the rail.
 */
export function AccountSettingsLink() {
  const Icon = settingsNavigationItem.icon;

  return (
    <Button asChild variant="outline" className="h-11 gap-2 px-3 sm:px-4">
      <Link
        href={settingsNavigationItem.href}
        aria-label={settingsNavigationItem.label}
        data-testid="account-settings-link"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{settingsNavigationItem.label}</span>
      </Link>
    </Button>
  );
}
