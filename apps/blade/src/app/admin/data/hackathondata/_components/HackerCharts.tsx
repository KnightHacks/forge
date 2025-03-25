import { api } from "~/trpc/react";
import AgeBarChart from "../../_components/data/AgeBarChart";

export default function HackerCharts({ hackathonId } : { hackathonId : string }) {
    const { data: hackers } = api.hacker.getHackers.useQuery(hackathonId);

    return (
        <div className="mt-8">
            {hackers === null ? (
                <p>This hackathon has no hackers!</p>
            ) : (
                hackers && (
                    <div>
                        <AgeBarChart people={hackers} />
                    </div>
                )
            )}
        </div>
    )
}