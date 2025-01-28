import { api, HydrateClient } from "~/trpc/server";
import MemberData from "./_components/MemberData";

export default function Data() {
    return (
        <HydrateClient>
            <main className="container">
                <div className="grid grid-cols-2 mt-10">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            Member Demographics
                        </h1>
                        <MemberData />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            Event Demographics
                        </h1>
                    </div>
                </div>
            </main>
        </HydrateClient>
    );
}