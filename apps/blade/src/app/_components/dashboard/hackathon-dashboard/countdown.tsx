"use client";

import { useEffect, useState } from "react";

import { cn } from "@forge/ui";
import { Card, CardContent } from "@forge/ui/card";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";

export function BaseHackathonCountdown({
  dashboardFrameTheme,
  endDate,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  endDate: Date;
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = endDate.getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const formatNumber = (num: number) => String(num).padStart(2, "0");

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border bg-gradient-to-tr from-background/50 to-primary/5 p-3 shadow-lg backdrop-blur-sm sm:p-4",
        dashboardFrameTheme?.sectionShellClassName,
      )}
    >
      <Card
        className={cn(
          "w-full max-w-3xl border-0 bg-transparent",
          dashboardFrameTheme?.sectionCardClassName,
        )}
      >
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <h1
            className={cn(
              "mb-3 text-center text-xl font-bold tracking-wider text-muted-foreground sm:mb-4 sm:text-2xl lg:text-3xl",
              dashboardFrameTheme?.sectionHeadingClassName,
            )}
          >
            HACKING ENDS IN
          </h1>

          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-1.5 shadow-lg sm:gap-2 lg:gap-3",
              dashboardFrameTheme?.countdownGroupClassName,
            )}
          >
            {/* Days */}
            <div
              className={cn(
                "flex items-center gap-1 sm:gap-2",
                dashboardFrameTheme?.countdownUnitWrapperClassName,
              )}
            >
              <Card
                className={cn(
                  "p-0 shadow-md",
                  dashboardFrameTheme?.countdownUnitCardClassName,
                )}
              >
                <CardContent className="flex flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.days)}
                  </div>
                  <div
                    className={cn(
                      "mt-1 hidden text-xs font-semibold text-muted-foreground sm:block sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    Days
                  </div>
                  <div
                    className={cn(
                      "mt-1 block text-xs font-semibold text-muted-foreground sm:hidden sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    D
                  </div>
                </CardContent>
              </Card>
              <div className="text-xl font-bold sm:text-3xl lg:text-4xl">:</div>
            </div>

            {/* Hours */}
            <div
              className={cn(
                "flex items-center gap-1 shadow-lg sm:gap-2",
                dashboardFrameTheme?.countdownUnitWrapperClassName,
              )}
            >
              <Card
                className={cn(
                  "p-0 shadow-md",
                  dashboardFrameTheme?.countdownUnitCardClassName,
                )}
              >
                <CardContent className="flex flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.hours)}
                  </div>
                  <div
                    className={cn(
                      "mt-1 hidden text-xs font-semibold text-muted-foreground sm:block sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    Hours
                  </div>
                  <div
                    className={cn(
                      "mt-1 block text-xs font-semibold text-muted-foreground sm:hidden sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    H
                  </div>
                </CardContent>
              </Card>
              <div className="text-xl font-bold sm:text-3xl lg:text-4xl">:</div>
            </div>

            {/* Minutes */}
            <div
              className={cn(
                "flex items-center gap-1 shadow-lg sm:gap-2",
                dashboardFrameTheme?.countdownUnitWrapperClassName,
              )}
            >
              <Card
                className={cn(
                  "p-0 shadow-md",
                  dashboardFrameTheme?.countdownUnitCardClassName,
                )}
              >
                <CardContent className="flex flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.minutes)}
                  </div>
                  <div
                    className={cn(
                      "mt-1 hidden text-xs font-semibold text-muted-foreground sm:block sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    Minutes
                  </div>
                  <div
                    className={cn(
                      "mt-1 block text-xs font-semibold text-muted-foreground sm:hidden sm:text-sm lg:text-base",
                      dashboardFrameTheme?.countdownUnitLabelClassName,
                    )}
                  >
                    M
                  </div>
                </CardContent>
              </Card>
              <div className="text-xl font-bold sm:text-3xl lg:text-4xl">:</div>
            </div>

            {/* Seconds */}
            <Card
              className={cn(
                "p-0 shadow-lg",
                dashboardFrameTheme?.countdownUnitCardClassName,
              )}
            >
              <CardContent className="flex flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                <div className="text-xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                  {formatNumber(timeLeft.seconds)}
                </div>
                <div
                  className={cn(
                    "mt-1 hidden text-xs font-semibold text-muted-foreground sm:block sm:text-sm lg:text-base",
                    dashboardFrameTheme?.countdownUnitLabelClassName,
                  )}
                >
                  Seconds
                </div>
                <div
                  className={cn(
                    "mt-1 block text-xs font-semibold text-muted-foreground sm:hidden sm:text-sm lg:text-base",
                    dashboardFrameTheme?.countdownUnitLabelClassName,
                  )}
                >
                  S
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
