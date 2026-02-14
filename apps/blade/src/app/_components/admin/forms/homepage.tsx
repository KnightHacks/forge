"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { CreateFormCard } from "~/app/_components/forms/shared/create-form-card";
import { FormCard } from "~/app/_components/forms/shared/form-card";
import { SectionManagerDialog } from "~/app/_components/forms/shared/section-manager-dialog";
import { api } from "~/trpc/react";

export default function FormsClient() {
  const router = useRouter();
  const LIMIT = 12;
  const [activeSection, setActiveSection] = useState<string>("General");

  const { data: sections = [] } = api.forms.getSections.useQuery();

  useEffect(() => {
    if (sections.length > 0 && !sections.includes(activeSection)) {
      const firstSection = sections[0];
      if (firstSection) {
        setActiveSection(firstSection);
      }
    }
  }, [sections, activeSection]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.forms.getForms.useInfiniteQuery(
      { limit: LIMIT, section: activeSection },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const forms = data ? data.pages.flatMap((page) => page.forms) : [];

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
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forms</h1>
        <SectionManagerDialog />
      </header>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="mb-6 h-auto gap-2 bg-transparent p-0">
          {sections.map((section: string) => (
            <TabsTrigger
              key={section}
              value={section}
              className="rounded-md border border-border bg-muted px-6 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
            >
              {section}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section: string) => (
          <TabsContent key={section} value={section}>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CreateFormCard section={section} />

              {forms.map((form) => (
                <FormCard
                  key={form.slugName}
                  slug_name={form.slugName}
                  createdAt={form.createdAt}
                  section={form.section}
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
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
