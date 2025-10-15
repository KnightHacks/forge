import { auth } from "@forge/auth";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { EmailDash } from "~/app/_components/emailDash";

export default async function AdminEmail() {
    const session = await auth();
    if (!session) {
        redirect(SIGN_IN_PATH);
    }

    const hasCheckIn = await api.auth.hasCheckIn();
    const hasFullAdmin = await api.auth.hasFullAdmin();

    if (!hasCheckIn && !hasFullAdmin) {
        redirect("/");
    }

    const user = await api.member.getMember();
    if (!user) {
        redirect("/");
    }

    return (
        <HydrateClient>
            <EmailDash />
        </HydrateClient>
    )
};