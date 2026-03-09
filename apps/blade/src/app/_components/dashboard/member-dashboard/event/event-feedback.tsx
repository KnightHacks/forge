"use client";

import { useState } from "react";

import type { InsertMember, SelectEvent } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { FormResponderWrapper } from "~/app/_components/forms/form-responder-client";

export function EventFeedbackForm({
  event,
  member,
  size,
}: {
  event: SelectEvent;
  member: InsertMember;
  size: "md" | "sm" | "lg" | "icon" | null | undefined;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const formName = event.name + " Feedback Form";
  const slugName = formName.toLowerCase().replaceAll(" ", "-");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{event.name} Feedback</DialogTitle>
        </DialogHeader>
        <FormResponderWrapper formName={slugName} userName={member.firstName} />
      </DialogContent>
    </Dialog>
  );
}
