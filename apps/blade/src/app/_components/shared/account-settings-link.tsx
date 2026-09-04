import Link from "next/link";

import { Button } from "@forge/ui/button";

import { settingsNavigationItem } from "./admin-navigation";

/** Settings is an account utility, not an admin destination, so it lives in the header for every signed-in user. */
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
