import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@forge/auth";
import { SIGN_IN_PATH } from "~/consts";

import { api, HydrateClient } from "~/trpc/server";
import HackathonDataContent from "./_components/HackathonDataContent";

export const metadata: Metadata = {
    title: "Blade | Hackathon Data",
    description: "View hackathon demographics.",
  };

export default async function HackathonData() {
    // authentication
    const session = await auth();
    if (!session) {
        redirect(SIGN_IN_PATH);
    }

    const isAdmin = await api.auth.getAdminStatus();
    if (!isAdmin) {
        redirect("/");
    }

    return (
        <HydrateClient>
            <main className="container">
                <HackathonDataContent />
            </main>
        </HydrateClient>
    );
}