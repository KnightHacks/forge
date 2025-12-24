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

    // TODO: Uncomment these when database is set up
    // User authentication check
    // const session = await auth();
    // if (!session) {
    //     redirect(SIGN_IN_PATH);
    // }

    // //user admin check
    // const isAdmin = await api.auth.getAdminStatus();
    // if (!isAdmin) {
    //     redirect("/");
    // }

    const formId = params["form-id"];

    // TODO: Replace with real API calls once DB is set up
    // const form = await api.forms.getForm({ name: formId });
    // const responses = await api.forms.getResponses({ form: formId });

    // Mock data for testing UI
    const responses = [
        {
            submittedAt: new Date("2024-01-15"),
            responseData: {
                "What is your favorite programming language?": "TypeScript",
                "How many years of experience do you have?": 3,
                "What do you like about Knight Hacks?": "Great community and learning opportunities!"
            },
            member: {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                id: "123"
            }
        },
        {
            submittedAt: new Date("2024-01-16"),
            responseData: {
                "What is your favorite programming language?": "Python",
                "How many years of experience do you have?": 5,
                "What do you like about Knight Hacks?": "The hackathons are amazing!"
            },
            member: {
                firstName: "Jane",
                lastName: "Smith",
                email: "jane@example.com",
                id: "456"
            }
        },
        {
            submittedAt: new Date("2024-01-17"),
            responseData: {
                "What is your favorite programming language?": "JavaScript",
                "How many years of experience do you have?": 2,
                "What do you like about Knight Hacks?": ""
            },
            member: {
                firstName: "Bob",
                lastName: "Johnson",
                email: "bob@example.com",
                id: "789"
            }
        }
    ];

    return (
        <HydrateClient>
            <main className="container h-screen">
                <h1>Form Responses for: {formId} </h1>
                <p>{responses.length} responses</p>

                <pre>
                    {JSON.stringify(responses, null, 2)}
                </pre>
            </main>
        </HydrateClient>
    )
}