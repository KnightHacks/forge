import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@forge/ui/button";

export function DiscordSignInLink({
  callbackURL = "/dashboard",
  children = "Sign in with Discord",
  className,
}: {
  callbackURL?: string;
  children?: ReactNode;
  className?: string;
}) {
  const href = `/api/auth/signin?provider=discord&callbackURL=${encodeURIComponent(
    callbackURL,
  )}`;

  return (
    <Button asChild size="lg" className={className}>
      <a href={href}>
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {children}
      </a>
    </Button>
  );
}
