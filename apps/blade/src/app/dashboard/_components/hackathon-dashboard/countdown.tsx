"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@forge/ui/card";

export default function HackingCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Set your target end date here
    const targetDate = new Date("2025-10-26T11:00:00").getTime();

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
  }, []);

  const formatNumber = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="flex items-center justify-center rounded-lg border bg-gradient-to-br from-background to-accent/10 p-3 sm:p-4">
      <Card className="w-full max-w-3xl border-0 bg-gradient-to-tr from-background/50 to-primary/5 shadow-lg backdrop-blur-sm">
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <h1 className="mb-3 text-center text-2xl font-bold tracking-tight sm:mb-4 sm:text-3xl lg:text-4xl">
            Hacking Ends In
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:gap-3">
            {/* Days */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Card className="shadow-md">
                <CardContent className="flex min-w-[70px] flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-3xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.days)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm lg:text-base">
                    Days
                  </div>
                </CardContent>
              </Card>
              <div className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                :
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Card className="shadow-md">
                <CardContent className="flex min-w-[70px] flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-3xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.hours)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm lg:text-base">
                    Hours
                  </div>
                </CardContent>
              </Card>
              <div className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                :
              </div>
            </div>

            {/* Minutes */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Card className="shadow-md">
                <CardContent className="flex min-w-[70px] flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                  <div className="text-3xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                    {formatNumber(timeLeft.minutes)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm lg:text-base">
                    Minutes
                  </div>
                </CardContent>
              </Card>
              <div className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                :
              </div>
            </div>

            {/* Seconds */}
            <Card className="shadow-md">
              <CardContent className="flex min-w-[70px] flex-col items-center justify-center p-2 sm:min-w-[90px] sm:p-3 lg:min-w-[110px] lg:p-4">
                <div className="text-3xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
                  {formatNumber(timeLeft.seconds)}
                </div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm lg:text-base">
                  Seconds
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
