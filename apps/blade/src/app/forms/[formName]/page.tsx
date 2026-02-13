import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card } from "@forge/ui/card";

import { api, HydrateClient } from "~/trpc/server";
import { FormResponderWrapper } from "./_components/form-responder-client";
import { XCircle } from "lucide-react";

import { auth } from "@forge/auth/server";

export async function generateMetadata({
  params,
}: {
  params: { formName: string };
}): Promise<Metadata> {
  try {
    const form = await api.forms.getForm({ slug_name: params.formName });
    const description = `Official application for ${form.name} through Blade.`;

    return {
      title: `Blade | ${form.name}`,
      description,
    };
  } catch {
    return {
      title: "Blade | Form Not Found",
    };
  }
}

function serializeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export default async function FormResponderPage({
  params,
  searchParams,
}: {
  params: { formName: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session) {
    const callbackURL =
      `/forms/${encodeURIComponent(params.formName)}` +
      serializeSearchParams(searchParams);
    redirect(`/?callbackURL=${encodeURIComponent(callbackURL)}`);
  }

  // use blade member name instead of discord name
  let userName = session.user.name || "Member";
  try {
    const member = await api.member.getMember();
    if (member?.firstName) {
      userName = member.firstName;
    }
  } catch {
    // fallback to discord name if member lookup fails
  }

	const formName = params.formName;

  const form = await api.forms.getForm({ slug_name: formName });

  const { canRespond } = await api.forms.checkResponseAccess({
    formId: form.id,
  });

  if (!canRespond) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="mb-2 text-2xl font-bold">
            You do not have permission to respond to this form
          </h1>
        </Card>
      </div>
    );
  }


  return (
    <HydrateClient>
      <FormResponderWrapper
        formName={formName}
        userName={userName}
      />
    </HydrateClient>
  );
}
