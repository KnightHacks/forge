import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { FormType } from "@forge/consts/knight-hacks";
import { auth } from "@forge/auth";
import { Button } from "@forge/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { AllResponsesView } from "./_components/AllResponsesView";
import { PerUserResponsesView } from "./_components/PerUserResponsesView";

export default async function FormResponsesPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["READ_FORMS", "EDIT_FORMS"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  // first verify form exists
  let form;
  try {
    form = await api.forms.getForm({ slug_name: params.slug });
  } catch {
    return (
      <HydrateClient>
        <main className="container py-8">
          <div className="py-12 text-center">
            <h1 className="mb-4 text-2xl font-bold">Form Not Found</h1>
            <p className="text-muted-foreground">
              The form &quot;{params.slug}&quot; does not exist.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Make sure you&apos;re using the correct form name. The form name
              is case sensitive and must match exactly.
            </p>
          </div>
        </main>
      </HydrateClient>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formData = form.formData as any as FormType;

  const apiResponses = await api.forms.getResponses({ form: form.id });

  // type assertion to the correct format
  const responses = apiResponses as {
    id: string;
    submittedAt: Date;
    responseData: Record<string, unknown>;
    member: {
      firstName: string;
      lastName: string;
      email: string;
      id: string;
    } | null;
  }[];

  return (
    <HydrateClient>
      <main className="container py-8">
        {/* page header with title and response count */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/forms" aria-label="Back to forms">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Form Responses for: {form.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {responses.length}{" "}
                {responses.length === 1 ? "response" : "responses"}
              </p>
            </div>
          </div>
        </div>

        {/* handle empty state when no responses */}
        {responses.length === 0 ? (
          <div className="mx-auto max-w-4xl">
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                No responses yet for this form.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Once responses are submitted, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <div className="mx-auto max-w-4xl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Responses</TabsTrigger>
                <TabsTrigger value="per-user">Per User</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all" className="mt-6">
              <AllResponsesView formData={formData} responses={responses} />
            </TabsContent>
            <TabsContent value="per-user" className="mt-6">
              <PerUserResponsesView formData={formData} responses={responses} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </HydrateClient>
  );
}
