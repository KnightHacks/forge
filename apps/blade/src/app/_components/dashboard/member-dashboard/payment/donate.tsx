"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Heart } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";

export function Donate() {
  const [hover, setHover] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Donate</CardTitle>
        <CreditCard color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardContent className="h-full">
        <div className="mt-3 h-full flex-col align-middle">
          <p className="mb-2 text-left text-[12px]">
            Empower the next generation of hackers
          </p>
          <Button
            className="w-full"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            asChild
          >
            <Link href={"https://buy.stripe.com/8x228qa5K1oUe9VdHkcfK0c"}>
              <Heart
                size={DASHBOARD_ICON_SIZE}
                fill={hover ? "white" : "none"}
                className="mr-1"
              />
              Donate to Knight Hacks
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
