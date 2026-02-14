import Link from "next/link";
import { MessageCircle, MessageSquare } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";

export function AlumniDiscord() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Alumni Discord</CardTitle>
        <MessageCircle
          color="hsl(263.4 70% 50.4%)"
          size={DASHBOARD_ICON_SIZE}
        />
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-left text-[12px]">
          Chat in the exlusive Alumni-only Knight Hacks Discord channel!
        </p>
        <Button className="w-full bg-[#5865F2] hover:bg-[#3D4CF6]" asChild>
          <Link
            href={
              "https://discord.com/channels/486628710443778071/1052981290267312248"
            }
          >
            <MessageSquare size={DASHBOARD_ICON_SIZE} className="mr-1" />
            Discord Channel
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
