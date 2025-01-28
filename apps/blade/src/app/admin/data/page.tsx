import { api, HydrateClient } from "~/trpc/server";

export default function Data() {
    return (
        <HydrateClient>
            <div>
            </div>
        </HydrateClient>
    );
}