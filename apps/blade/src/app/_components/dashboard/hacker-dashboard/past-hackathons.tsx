import { Eye, Users } from "lucide-react";

import { cn } from "@forge/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { time } from "@forge/utils";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import type { api } from "~/trpc/server";

const triggerClassName =
  "relative flex h-14 w-full cursor-pointer items-center justify-center gap-x-2 border border-[#1F2937] bg-transparent transition-all duration-200 ease-in-out hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937]";

export function PastHackathonButton({
  actionButtonClassName,
  actionIconClassName,
  dashboardFrameTheme,
  hackathons,
}: {
  actionButtonClassName?: string;
  actionIconClassName?: string;
  dashboardFrameTheme?: DashboardFrameTheme;
  hackathons: Awaited<ReturnType<(typeof api.hackathon)["getPastHackathons"]>>;
}) {
  const mostRecent = hackathons[0];

  if (!mostRecent) {
    return (
      <Dialog>
        <div className="flex w-full flex-row justify-between">
          <DialogTrigger
            className={cn(triggerClassName, actionButtonClassName)}
          >
            <Eye className={actionIconClassName} />
            <span className="text-lg font-bold">View Past Hackathons</span>
          </DialogTrigger>
        </div>
        <DialogContent
          className={cn(
            "max-h-[80vh] max-w-2xl overflow-y-auto !border-0",
            dashboardFrameTheme?.pastHackathonsDialogContentClassName,
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={
                dashboardFrameTheme?.pastHackathonsDialogTitleClassName
              }
            >
              Past Hackathons Attended
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "mt-5 flex items-center justify-center text-center text-lg font-bold text-gray-500 dark:text-gray-400",
              dashboardFrameTheme?.pastHackathonsEmptyClassName,
            )}
          >
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
        <DialogTrigger className={cn(triggerClassName, actionButtonClassName)}>
          <Eye className={actionIconClassName} />
          <span className="text-lg font-bold">View Past Hackathons</span>
        </DialogTrigger>
      </div>
      <DialogContent
        className={cn(
          "max-h-[80vh] max-w-2xl overflow-y-auto !border-0",
          dashboardFrameTheme?.pastHackathonsDialogContentClassName,
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={dashboardFrameTheme?.pastHackathonsDialogTitleClassName}
          >
            Past Hackathons Attended
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {hackathons.map((hackathon) => (
            <Card
              key={hackathon.id}
              className={cn(
                "relative !border-0 bg-[#E5E7EB] !shadow-none dark:!bg-[#0A0F1D]",
                dashboardFrameTheme?.pastHackathonsCardClassName,
              )}
            >
              {/* Transparent Triangle overlay */}
              {!dashboardFrameTheme?.hidePastHackathonsCardCutout && (
                <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[50px] border-l-[50px] border-b-background border-l-transparent sm:border-b-[180px] sm:border-l-[100px]"></div>
              )}
              <CardHeader>
                <div className="flex flex-col items-start justify-between sm:flex-row">
                  <div
                    className={cn(
                      "order-2 pr-5 text-primary sm:order-1",
                      dashboardFrameTheme?.pastHackathonsCardTitleClassName,
                    )}
                  >
                    <CardTitle>{hackathon.displayName}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex w-full max-w-md gap-x-10 gap-y-2">
                      <div className="flex flex-col items-start">
                        <span
                          className={cn(
                            "font-medium text-gray-600",
                            dashboardFrameTheme?.pastHackathonsLabelClassName,
                          )}
                        >
                          Start
                        </span>
                        <span
                          className={cn(
                            "mt-1 font-medium",
                            dashboardFrameTheme?.pastHackathonsValueClassName,
                          )}
                        >
                          {time.formatDateTime(hackathon.startDate)}
                        </span>
                      </div>

                      <div className="flex flex-col items-start">
                        <span
                          className={cn(
                            "font-medium text-gray-600",
                            dashboardFrameTheme?.pastHackathonsLabelClassName,
                          )}
                        >
                          End
                        </span>
                        <span
                          className={cn(
                            "mt-1 font-medium",
                            dashboardFrameTheme?.pastHackathonsValueClassName,
                          )}
                        >
                          {time.formatDateTime(hackathon.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users
                      className={cn(
                        "h-4 w-4 text-gray-500",
                        dashboardFrameTheme?.pastHackathonsIconClassName,
                      )}
                    />
                    <span
                      className={
                        dashboardFrameTheme?.pastHackathonsValueClassName
                      }
                    >
                      {hackathon.numAttended}{" "}
                      {hackathon.numAttended === 1 ? "Attendee" : "Attendees"}
                    </span>
                  </div>
                  <div className="flex gap-x-2">
                    <span
                      className={cn(
                        "text-gray-600",
                        dashboardFrameTheme?.pastHackathonsLabelClassName,
                      )}
                    >
                      Theme
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        dashboardFrameTheme?.pastHackathonsValueClassName,
                      )}
                    >
                      {hackathon.theme}
                    </span>
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
