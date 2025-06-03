import { HACKATHON_APPLICATION_STATES } from "@forge/consts/knight-hacks";
import { ToggleGroup, ToggleGroupItem } from "@forge/ui/toggle-group";

import AgeBarChart from "~/app/admin/_components/AgeBarChart";
import RaceOrEthnicityPie from "~/app/admin/_components/RaceOrEthnicityPie";
import SchoolYearPie from "~/app/admin/_components/SchoolYearPie";
import { api } from "~/trpc/react";
import FirstTimeInfo from "./FirstTimeInfo";

export default function HackerCharts({ hackathonId }: { hackathonId: string }) {
  const { data: hackers } = api.hacker.getHackers.useQuery(hackathonId);

  return (
    <div className="mt-8">
      {hackers === null ? (
        <h1 className="mt-20 text-center text-xl">
          This hackathon has no hackers!
        </h1>
      ) : (
        hackers && (
          <div className="grid gap-4">
            <ToggleGroup className="w-fit" variant="outline" type="multiple">
              <ToggleGroupItem value="all" aria-label="toggle-all">
                all
              </ToggleGroupItem>
              {HACKATHON_APPLICATION_STATES.map((item) => (
                <ToggleGroupItem value={item} aria-label={`toggle-${item}`}>
                  {item}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
              <FirstTimeInfo hackers={hackers} />
              <AgeBarChart people={hackers} />
              <RaceOrEthnicityPie people={hackers} />
              <SchoolYearPie people={hackers} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
