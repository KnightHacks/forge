"use client";

import { Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

interface EventWithRating {
  id: string;
  name: string;
  averageRating: number | null;
  feedbackCount: number;
}

export function ViewRatingButton({ event }: { event: EventWithRating }) {
  if (!event.averageRating || event.feedbackCount === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const averageRating = event.averageRating.toFixed(1);

  return (
    <div className="flex items-center justify-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <Dialog>
        <DialogTrigger asChild>
          <span className="cursor-pointer underline">{averageRating}</span>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Event Rating for {event.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-12 w-12 fill-yellow-400 text-yellow-400" />
              <span className="text-4xl font-bold">{averageRating}</span>
              <span className="text-2xl text-muted-foreground">/ 10</span>
            </div>
            <p className="text-center text-muted-foreground">
              Based on {event.feedbackCount}{" "}
              {event.feedbackCount === 1 ? "response" : "responses"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
