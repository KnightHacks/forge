import { CalendarDays, Tag, Trophy } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import type { api } from "~/trpc/server";
import { formatDateRange } from "~/lib/utils";

export function HackathonShowcase({
  hackathons,
}: {
  hackathons: Awaited<ReturnType<(typeof api.member)["getHackathons"]>>;
}) {
  hackathons.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const mostRecent = hackathons[0];

  if (!mostRecent) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Recent Hackathon Attended
          </CardTitle>
          <Trophy color="hsl(263.4 70% 50.4%)" size={15} />
        </CardHeader>
        <CardHeader>
          <CardTitle>No hackathons found</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Recent Hackathon Attended
        </CardTitle>
        <Trophy color="hsl(263.4 70% 50.4%)" size={15} />
      </CardHeader>
      <CardHeader>
        <CardTitle>{mostRecent.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          {mostRecent.theme}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gray-500" />
          <span>
            {formatDateRange(mostRecent.startDate, mostRecent.endDate)}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">View All</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Past Hackathons Attended</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {hackathons.slice(1).map((hackathon) => (
                <Card key={hackathon.id}>
                  <CardHeader>
                    <CardTitle>{hackathon.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {hackathon.theme}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      <span>
                        {formatDateRange(
                          hackathon.startDate,
                          hackathon.endDate,
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogDescription></DialogDescription>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
