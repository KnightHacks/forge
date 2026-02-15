"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Button } from "@forge/ui/button";

interface EventWithFormSlug {
  id: string;
  formSlug: string | null;
}

export function ViewFeedbackButton({ event }: { event: EventWithFormSlug }) {
  if (!event.formSlug) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <MessageSquare className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/admin/forms/${event.formSlug}/responses`}>
        <MessageSquare className="h-4 w-4" />
      </Link>
    </Button>
  );
}
