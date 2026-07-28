import type { Metadata } from "next";

import { MemberFormHistory } from "~/app/_components/member/member-form-history";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review the Knight Hacks forms you have submitted.",
  title: "Blade | Previous Forms",
};

export default async function MemberFormsPage() {
  const responses = await api.forms.memberHistory();

  return (
    <MemberFormHistory
      responses={responses.map((response) => ({
        ...response,
        submittedAt: response.submittedAt.toISOString(),
      }))}
    />
  );
}
