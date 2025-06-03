import { HACKATHON_APPLICATION_STATES } from "@forge/consts/knight-hacks";
import { ToggleGroup, ToggleGroupItem } from "@forge/ui/toggle-group";
import { useState } from "react";

import AgeBarChart from "~/app/admin/_components/AgeBarChart";
import RaceOrEthnicityPie from "~/app/admin/_components/RaceOrEthnicityPie";
import SchoolYearPie from "~/app/admin/_components/SchoolYearPie";
import { api } from "~/trpc/react";
import FirstTimeInfo from "./FirstTimeInfo";

export default function HackerCharts({ hackathonId }: { hackathonId: string }) {
  const { data: hackers } = api.hacker.getHackers.useQuery(hackathonId);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["all"]);
  const handleStatusChange = (values: string[]) => {
    // reselect "all" if user deselects every other status filter option
    if (values.length === 0) {
      setSelectedStatuses(["all"]);
      return;
    }

    // reset to only "all"
    if (values.includes("all") && !selectedStatuses.includes("all")) {
      setSelectedStatuses(["all"]);
    } 
    // if "all" was previously selected and now something else is selected
    else if (selectedStatuses.includes("all") && values.length > 1) {
      setSelectedStatuses(values.filter((v) => v !== "all"));
    } 
    // update normally
    else {
      setSelectedStatuses(values);
    }
  };

  const filteredHackers = selectedStatuses.includes("all") || selectedStatuses.length === 0
    ? hackers
    : hackers?.filter((hacker) => selectedStatuses.includes(hacker.status));


  return (
    <div className="mt-8">
      {hackers === null ? (
        <h1 className="mt-20 text-center text-xl">
          This hackathon has no hackers!
        </h1>
      ) : (
        hackers && (
          <div className="grid gap-4">
            <div className="flex flex-row gap-4 p-3 w-fit">
              <h2 className="text-lg font-semibold flex items-center">Filter by status:</h2>
              <ToggleGroup id="status-select" className="w-fit" variant="outline" type="multiple" value={selectedStatuses} onValueChange={handleStatusChange}>
                <ToggleGroupItem value="all" aria-label="toggle-all">
                  all
                </ToggleGroupItem>
                {HACKATHON_APPLICATION_STATES.map((item) => (
                  <ToggleGroupItem key={item} value={item} aria-label={`toggle-${item}`}>
                    {item}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
        {
          filteredHackers && filteredHackers.length > 0 ?
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
            <FirstTimeInfo hackers={filteredHackers} />
            <AgeBarChart people={filteredHackers} />
            <RaceOrEthnicityPie people={filteredHackers} />
            <SchoolYearPie people={filteredHackers} />
          </div>
          :
          <h1 className="mt-20 text-center text-xl">
            No hackers match the current filter
          </h1>
        }
          </div>
        )
      )}
    </div>
  );
}
