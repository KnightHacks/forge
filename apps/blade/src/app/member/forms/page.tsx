import type { Metadata } from "next";

import { MemberFormHistory } from "~/app/_components/member/member-form-history";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review your retained Knight Hacks form responses.",
  title: "Blade | Previous Forms",
};

export default async function MemberFormsPage() {
  const responses = await api.forms.memberHistory();

  return (
    <HydrateClient>
      <MemberFormHistory
        responses={responses.map((response) => ({
          ...response,
          submittedAt: response.submittedAt.toISOString(),
        }))}
      />
    </HydrateClient>
  );
}
