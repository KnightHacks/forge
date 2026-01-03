"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CreateFormCard } from "~/components/forms/create-form-card";
import { FormCard } from "~/components/forms/form-card";
import { api } from "~/trpc/react";

export default function FormsClient() {
  const router = useRouter();
  const LIMIT = 12;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.forms.getForms.useInfiniteQuery(
      { limit: LIMIT },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    );

  const forms = data?.pages.flatMap((page) => page.forms) ?? [];

  useEffect(() => {
    const onScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 250
      ) {
        void fetchNextPage();
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <main className="container py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Forms</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CreateFormCard />

        {forms.map((form) => (
          <FormCard
            key={form.slugName}
            slug_name={form.slugName}
            createdAt={form.createdAt}
            onOpen={() =>
              router.push(`/forms/${encodeURIComponent(form.slugName)}`)
            }
          />
        ))}
      </section>

      {isFetchingNextPage && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Loading more…
        </p>
      )}
    </main>
  );
}
