"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { MarkdownContent } from "@forge/ui/markdown-content";

import type { MemberEventItem } from "./member-events-dashboard";
import { useNavigationRouter } from "~/app/_components/shared/route-transition-link";
import { formatEventDateTime } from "~/lib/dates";

export function MemberEventDialog({
  event,
  calendarUrl,
}: {
  event: MemberEventItem | null;
  calendarUrl?: string;
}) {
  const router = useNavigationRouter();
  const searchParams = useSearchParams();
  const title = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`/member/events${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl bg-card [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center"
        onOpenAutoFocus={(focusEvent) => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          // Start at the title, even when a long description contains links.
          focusEvent.preventDefault();
          title.current?.focus();
        }}
        onCloseAutoFocus={(focusEvent) => {
          // URL-driven dialogs have no Radix trigger to restore focus to.
          focusEvent.preventDefault();
          opener.current?.focus();
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle
            ref={title}
            tabIndex={-1}
            className="break-words pr-12 leading-snug tracking-normal focus:outline-none"
          >
            {event?.name ?? "Event unavailable"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? `${formatEventDateTime(event.startAt)} · ${event.location}`
              : "This event may have ended or may not be available to your account."}
          </DialogDescription>
        </DialogHeader>
        {event && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{event.tag}</Badge>
              {event.requiresDues && (
                <Badge variant="outline">Dues required</Badge>
              )}
              {event.internal && <Badge variant="outline">Internal</Badge>}
            </div>
            <MarkdownContent className="min-w-0 break-words text-sm leading-6">
              {event.description}
            </MarkdownContent>
            <p className="text-sm text-muted-foreground">
              Ends {formatEventDateTime(event.endAt)}
            </p>
            <DialogFooter className="flex-wrap gap-2">
              {event.discordUrl && (
                <Button asChild variant="outline" className="min-h-11">
                  <a href={event.discordUrl} target="_blank" rel="noreferrer">
                    Open in Discord
                  </a>
                </Button>
              )}
              {calendarUrl && (
                <Button asChild variant="outline" className="min-h-11">
                  <a href={calendarUrl} target="_blank" rel="noreferrer">
                    Add to Google Calendar
                  </a>
                </Button>
              )}
              {event.locked && (
                <Button asChild className="min-h-11">
                  <a href="/member/dues">Pay dues</a>
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
