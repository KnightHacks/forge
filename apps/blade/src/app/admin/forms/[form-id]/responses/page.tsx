import type { Metadata } from "next";
import { auth } from "@forge/auth";
import { SIGN_IN_PATH } from "~/consts";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
    title: "Blade | Form Responses",
    description: "View Form Responses",
};

export default async function FormResponsesPage({
    params,
}: {
    params: {"form-id": string };
}) {

    // User authentication check
    const session = await auth();
    if (!session) {
        redirect(SIGN_IN_PATH);
    }

    //user admin check
    const isAdmin = await api.auth.getAdminStatus();
    if (!isAdmin) {
        redirect("/");
    }

    const formId = params["form-id"];

    return (
        <HydrateClient>
            <main className="container h-screen">
                <h1>Form Responses for: {formId} </h1>
            </main>
        </HydrateClient>
    )
}