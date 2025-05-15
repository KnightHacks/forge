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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
            <FirstTimeInfo hackers={hackers} />
            <AgeBarChart people={hackers} />
            <RaceOrEthnicityPie people={hackers} />
            <SchoolYearPie people={hackers} />
          </div>
        )
      )}
    </div>
  );
}
