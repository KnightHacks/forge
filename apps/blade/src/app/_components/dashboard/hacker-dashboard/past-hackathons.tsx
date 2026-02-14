import { Eye, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import type { api } from "~/trpc/server";
import { formatDateTime } from "~/lib/utils";

export function PastHackathonButton({
  hackathons,
}: {
  hackathons: Awaited<ReturnType<(typeof api.hackathon)["getPastHackathons"]>>;
}) {
  const mostRecent = hackathons[0];

  if (!mostRecent) {
    return (
      <Dialog>
        <div className="flex w-full flex-row justify-between">
          <DialogTrigger asChild>
            <div className="relative flex h-14 w-full cursor-pointer items-center justify-center gap-x-2 border border-[#1F2937] transition-all duration-200 ease-in-out hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937]">
              <Eye />
              <div className="text-lg font-bold">View Past Hackathons</div>
            </div>
          </DialogTrigger>
        </div>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto !border-0">
          <DialogHeader>
            <DialogTitle>Past Hackathons Attended</DialogTitle>
          </DialogHeader>
          <div className="mt-5 flex items-center justify-center text-center text-lg font-bold text-gray-500 dark:text-gray-400">
            <div>No hackathons found!</div>
          </div>
          <DialogDescription></DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <div className="flex w-full flex-row justify-between">
        <DialogTrigger asChild>
          <div className="relative flex h-14 w-full cursor-pointer items-center justify-center gap-x-2 border border-[#1F2937] transition-all duration-200 ease-in-out hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937]">
            <Eye />
            <div className="text-lg font-bold">View Past Hackathons</div>
          </div>
        </DialogTrigger>
      </div>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto !border-0">
        <DialogHeader>
          <DialogTitle>Past Hackathons Attended</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {hackathons.map((hackathon) => (
            <Card
              key={hackathon.id}
              className="relative !border-0 bg-[#E5E7EB] !shadow-none dark:!bg-[#0A0F1D]"
            >
              {/* Transparent Triangle overlay */}
              <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[50px] border-l-[50px] border-b-background border-l-transparent sm:border-b-[180px] sm:border-l-[100px]"></div>
              <CardHeader>
                <div className="flex flex-col items-start justify-between sm:flex-row">
                  <div className="order-2 pr-5 text-primary sm:order-1">
                    <CardTitle>{hackathon.displayName}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex w-full max-w-md gap-x-10 gap-y-2">
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-gray-600">Start</span>
                        <span className="mt-1 font-medium">
                          {formatDateTime(hackathon.startDate)}
                        </span>
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="font-medium text-gray-600">End</span>
                        <span className="mt-1 font-medium">
                          {formatDateTime(hackathon.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>
                      {hackathon.numAttended}{" "}
                      {hackathon.numAttended === 1 ? "Attendee" : "Attendees"}
                    </span>
                  </div>
                  <div className="flex gap-x-2">
                    <span className="text-gray-600">Theme</span>
                    <span className="font-medium">{hackathon.theme}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogDescription></DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
