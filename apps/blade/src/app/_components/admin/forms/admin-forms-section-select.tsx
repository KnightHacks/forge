"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function sectionSelectionHref(
  pathname: string,
  currentSearch: string,
  sectionId: string,
) {
  const params = new URLSearchParams(currentSearch);
  if (sectionId) params.set("section", sectionId);
  else params.delete("section");
  params.delete("page");
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

export function AdminFormsSectionSelect({
  sections,
  selectedSectionId,
}: {
  sections: { id: string; name: string }[];
  selectedSectionId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="ml-auto min-w-0 basis-full sm:basis-auto">
      <label className="sr-only" htmlFor="form-section">
        Form section
      </label>
      <select
        aria-label="Form section"
        className="h-11 w-full min-w-0 rounded-md border border-input bg-background/70 px-3 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56 sm:text-sm"
        data-auto-swap="query-param"
        id="form-section"
        name="section"
        onChange={(event) =>
          router.replace(
            sectionSelectionHref(
              pathname,
              searchParams.toString(),
              event.target.value,
            ),
          )
        }
        value={selectedSectionId ?? ""}
      >
        <option value="">All sections</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>
    </div>
  );
}
