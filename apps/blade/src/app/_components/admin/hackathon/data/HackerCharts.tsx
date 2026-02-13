import { useState } from "react";

import { HACKATHON_APPLICATION_STATES } from "@forge/consts/knight-hacks";
import { ToggleGroup, ToggleGroupItem } from "@forge/ui/toggle-group";

import AgeBarChart from "~/app/_components/admin/charts/AgeBarChart";
import FirstTimeHackersPie from "~/app/_components/admin/charts/FirstTimeHackersPie";
import FoodAllergiesBarChart from "~/app/_components/admin/charts/FoodAllergiesBarChart";
import GenderPie from "~/app/_components/admin/charts/GenderPie";
import MajorBarChart from "~/app/_components/admin/charts/MajorBarChart";
import RaceOrEthnicityPie from "~/app/_components/admin/charts/RaceOrEthnicityPie";
import SchoolBarChart from "~/app/_components/admin/charts/SchoolBarChart";
import SchoolYearPie from "~/app/_components/admin/charts/SchoolYearPie";
import { api } from "~/trpc/react";
import ApplicationsOverTimeBarChart from "./ApplicationsOverTimeBarChart";
import FirstTimeInfo from "./FirstTimeInfo";
import LevelOfStudyPie from "./LevelOfStudyPie";
import ShirtSizePie from "./ShirtSizePie";

export default function HackerCharts({ hackathonId }: { hackathonId: string }) {
  const { data: hackers } = api.hacker.getHackers.useQuery(hackathonId);
  const { data: hackathon } =
    api.hackathon.getHackathonById.useQuery(hackathonId);

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

  const filteredHackers =
    selectedStatuses.includes("all") || selectedStatuses.length === 0
      ? hackers
      : hackers?.filter((hacker) => selectedStatuses.includes(hacker.status));

  return (
    <div className="mt-4 md:mt-8">
      {hackers === null ? (
        <h1 className="mt-20 text-center text-xl">
          This hackathon has no hackers!
        </h1>
      ) : (
        hackers && (
          <div className="grid gap-4">
            <div className="flex w-fit flex-col gap-2 md:flex-row md:gap-4">
              <h2 className="flex items-center font-semibold md:text-lg">
                Filter by status:
              </h2>
              <ToggleGroup
                className="flex flex-wrap"
                variant="outline"
                type="multiple"
                value={selectedStatuses}
                onValueChange={handleStatusChange}
              >
                <ToggleGroupItem value="all" aria-label="toggle-all">
                  all
                </ToggleGroupItem>
                {HACKATHON_APPLICATION_STATES.map((item) => (
                  <ToggleGroupItem
                    key={item}
                    value={item}
                    aria-label={`toggle-${item}`}
                  >
                    {item}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {filteredHackers && filteredHackers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                <FirstTimeInfo hackers={filteredHackers} />
                <ApplicationsOverTimeBarChart
                  hackers={filteredHackers}
                  selectedStatuses={selectedStatuses}
                />
                <FoodAllergiesBarChart people={filteredHackers} />
                <FirstTimeHackersPie people={filteredHackers} />
                <AgeBarChart people={filteredHackers} />
                <GenderPie people={filteredHackers} />
                <RaceOrEthnicityPie people={filteredHackers} />
                <SchoolYearPie people={filteredHackers} />
                {hackathon && (
                  <LevelOfStudyPie
                    hackers={filteredHackers}
                    hackathonDate={hackathon.startDate}
                  />
                )}
                <SchoolBarChart people={filteredHackers} />
                <MajorBarChart people={filteredHackers} />
                <ShirtSizePie hackers={filteredHackers} />
              </div>
            ) : (
              <h1 className="mt-20 text-center text-xl">
                No hackers match the current filter
              </h1>
            )}
          </div>
        )
      )}
    </div>
  );
}
