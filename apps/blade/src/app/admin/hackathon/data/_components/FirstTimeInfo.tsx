import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function ({ hackers }: { hackers: InsertHacker[] }) {
  const firstTimeCount =
    hackers.filter((hacker) => hacker.isFirstTime).length || 0;
  const firstTimePercent =
    hackers.length > 0 ? (firstTimeCount / hackers.length) * 100 : 0;

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">First Time Hackers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:gap-6 lg:flex-row lg:gap-6">
          <p>
            <span className="text-xl font-bold text-green-600">
              {firstTimePercent.toFixed(2)}%{" "}
            </span>
            <span className="text-muted-foreground">
              are first time hackers.
            </span>
          </p>
          <p>
            <span className="text-xl font-bold text-red-600">
              {(100 - firstTimePercent).toFixed(2)}%{" "}
            </span>
            <span className="text-muted-foreground">are return hackers.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
