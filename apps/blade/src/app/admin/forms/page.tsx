import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { canAccessFormAdmin } from "~/app/_components/admin/access";
import { AdminFormsDashboard } from "~/app/_components/admin/forms/admin-forms-dashboard";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Create, publish, share, and review Knight Hacks forms.",
  title: "Blade | Form Administration",
};

export default async function AdminFormsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessFormAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const params = await searchParams;
  const view = params.view === "archive" ? "archive" : "active";
  const query = typeof params.query === "string" ? params.query : "";
  const result = await api.forms.listAdmin();
  const requestedSectionId =
    typeof params.section === "string" ? params.section : null;
  const selectedSectionId = result.sections.some(
    (section) => section.id === requestedSectionId,
  )
    ? requestedSectionId
    : null;
  const forms = result.forms
    .filter((form) =>
      view === "archive"
        ? form.state === "archived"
        : form.state !== "archived",
    )
    .filter((form) =>
      query ? form.name.toLowerCase().includes(query.toLowerCase()) : true,
    )
    .filter((form) =>
      selectedSectionId ? form.section.id === selectedSectionId : true,
    )
    .map((form) => ({
      ...form,
      closesAt: form.closesAt?.toISOString() ?? null,
      opensAt: form.opensAt?.toISOString() ?? null,
    }));

  return (
    <HydrateClient>
      <AdminFormsDashboard
        access={{
          canEdit: permissions.EDIT_FORMS === true,
          canManageSections: permissions.IS_OFFICER === true,
          canRead: permissions.READ_FORMS === true,
          canReadResponses: permissions.READ_FORM_RESPONSES === true,
          isOfficer: permissions.IS_OFFICER === true,
        }}
        data={{
          forms,
          pagination: {
            page: 1,
            pageCount: 1,
            pageSize: Math.max(forms.length, 1),
            totalCount: forms.length,
          },
          sections: result.sections,
        }}
        input={{
          page: 1,
          pageSize: Math.max(forms.length, 1),
          query,
          sectionIds: selectedSectionId ? [selectedSectionId] : [],
          states: [],
          view,
        }}
      />
    </HydrateClient>
  );
}
