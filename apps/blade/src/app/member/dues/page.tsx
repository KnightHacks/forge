import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  MEMBER_DASHBOARD_PATH,
  MEMBER_SIGNUP_FORM_SLUG,
} from "@forge/validators";

import { canAccessMemberAdmin } from "~/app/_components/admin/access";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { MemberDuesPayment } from "~/app/_components/member/member-dues-payment";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Member Dues",
  description: "Pay Knight Hacks member dues.",
};

export default async function MemberDuesPage() {
  const session = await auth();

  if (!session) redirect("/");

  const [member, effectivePermissions] = await Promise.all([
    api.member.getMember(),
    api.roles.getPermissions(),
  ]);

  if (!member) redirect(`/form/${MEMBER_SIGNUP_FORM_SLUG}`);

  const duesStatus = await api.dues.getStatus();

  if (duesStatus.paid) redirect(MEMBER_DASHBOARD_PATH);

  let paymentIntent: Awaited<
    ReturnType<typeof api.dues.createPaymentIntent>
  > | null = null;
  let paymentSetupError: string | null = null;

  if (env.NEXT_PUBLIC_BLADE_E2E_AUTH !== "true") {
    try {
      paymentIntent = await api.dues.createPaymentIntent();
    } catch (error) {
      paymentSetupError =
        error instanceof Error
          ? error.message
          : "Could not initialize dues payment.";
    }
  }

  return (
    <HydrateClient>
      <AuthenticatedShell
        canAccessAdmin={canAccessMemberAdmin(effectivePermissions)}
        session={session}
      >
        <MemberDuesPayment
          duesStatus={duesStatus}
          initialPaymentIntent={paymentIntent}
          initialPaymentError={paymentSetupError}
        />
      </AuthenticatedShell>
    </HydrateClient>
  );
}
