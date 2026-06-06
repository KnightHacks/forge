import { Info } from "lucide-react";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { QRCodePopup } from "~/app/_components/navigation/user-qr-code";
import { DASHBOARD_ICON_SIZE } from "~/consts";
import { DownloadQRPass } from "./download-qr-pass";
import { ResumeButton } from "./resume-button";

export function MemberInfo({
  member,
}: {
  member: Pick<InsertMember, "firstName" | "lastName">;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Info</CardTitle>
        <Info color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          <QRCodePopup />
          <DownloadQRPass profile={member} />
          <ResumeButton />
        </div>
      </CardContent>
    </Card>
  );
}
