import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminFormsDashboard } from "~/app/_components/admin/forms/admin-forms-dashboard";
import { sectionSelectionHref } from "~/app/_components/admin/forms/admin-forms-section-select";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/forms",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const form = {
  access: { canEdit: true, canReadResponses: true },
  closesAt: "2026-09-01T03:59:59.000Z",
  id: "00000000-0000-4000-8000-000000001001",
  manualClosed: false,
  name: "Workshop Interest",
  opensAt: "2026-08-01T04:00:00.000Z",
  responseCount: 12,
  responseMode: "single_locked" as const,
  section: {
    id: "00000000-0000-4000-8000-000000001101",
    name: "Outreach",
  },
  slugName: "workshop-interest",
  state: "published" as const,
};

const data = {
  forms: [form],
  pagination: { page: 1, pageCount: 1, pageSize: 25, totalCount: 1 },
  sections: [form.section],
};

const input = {
  page: 1,
  pageSize: 25 as const,
  query: "",
  sectionIds: [] as string[],
  states: [] as ("archived" | "draft" | "published")[],
  view: "active" as const,
};

function renderDashboard(access: {
  canEdit: boolean;
  canManageSections: boolean;
  canRead: boolean;
  canReadResponses: boolean;
  isOfficer: boolean;
}) {
  return renderToStaticMarkup(
    createElement(AdminFormsDashboard, {
      access,
      data: {
        ...data,
        forms: [
          {
            ...form,
            access: {
              canEdit: access.canEdit || access.isOfficer,
              canReadResponses: access.canReadResponses || access.isOfficer,
            },
          },
        ],
      },
      input,
    }),
  );
}

describe("AdminFormsDashboard", () => {
  it("TC-001 TC-006 gives a form reader section-scoped context without mutation or response controls", () => {
    const html = renderDashboard({
      canEdit: false,
      canManageSections: false,
      canRead: true,
      canReadResponses: false,
      isOfficer: false,
    });

    expect(html).toContain("Form administration");
    expect(html).toContain("Workshop Interest");
    expect(html).toContain("Outreach");
    expect(html).toContain("12 responses");
    expect(html).toContain("Share");
    expect(html).toContain("Archive");
    expect(html).not.toContain("Create form");
    expect(html).not.toContain("Edit form");
    expect(html).not.toContain("Manage sections");
    expect(html).not.toContain("View responses");
    expect(html).not.toContain("Export CSV");
  });

  it("TC-025 exposes identified-response entry only to a response reader", () => {
    const withoutResponseAccess = renderDashboard({
      canEdit: true,
      canManageSections: false,
      canRead: true,
      canReadResponses: false,
      isOfficer: false,
    });
    const withResponseAccess = renderDashboard({
      canEdit: false,
      canManageSections: false,
      canRead: true,
      canReadResponses: true,
      isOfficer: false,
    });

    expect(withoutResponseAccess).not.toContain("View responses");
    expect(withResponseAccess).toContain("View responses");
  });

  it("uses each form's section capability for edit and response actions", () => {
    const html = renderToStaticMarkup(
      createElement(AdminFormsDashboard, {
        access: {
          canEdit: true,
          canManageSections: false,
          canRead: true,
          canReadResponses: true,
          isOfficer: false,
        },
        data: {
          ...data,
          forms: [
            {
              ...form,
              access: { canEdit: false, canReadResponses: false },
            },
          ],
        },
        input,
      }),
    );

    expect(html).not.toContain("Edit form");
    expect(html).not.toContain("View responses");
    expect(html).toContain(`href="/admin/forms/${form.id}?dialog=share"`);
  });

  it("TC-001 keeps section management officer-only while exposing form editing to an editor", () => {
    const editorHtml = renderDashboard({
      canEdit: true,
      canManageSections: false,
      canRead: true,
      canReadResponses: false,
      isOfficer: false,
    });
    const officerHtml = renderDashboard({
      canEdit: true,
      canManageSections: true,
      canRead: true,
      canReadResponses: true,
      isOfficer: true,
    });

    expect(editorHtml).toContain("Create form");
    expect(editorHtml).toContain("Edit form");
    expect(editorHtml).not.toContain("Manage sections");
    expect(officerHtml).toContain("Manage sections");
  });

  it("uses the established responsive admin surface and accessible controls", () => {
    const html = renderDashboard({
      canEdit: true,
      canManageSections: false,
      canRead: true,
      canReadResponses: true,
      isOfficer: false,
    });

    expect(html).toContain('data-forms-admin-layout="responsive"');
    expect(html).toContain('aria-label="Forms"');
    expect(html).toContain('aria-label="Search forms"');
    expect(html).toContain('aria-label="Form section"');
    expect(html).toContain("All sections");
    expect(html).toContain('data-auto-swap="query-param"');
    expect(html).not.toContain("View section");
    expect(html).toContain('data-section-context="all"');
    expect(html).toMatch(/(?:min-h-11|h-11)/);
    expect(html).toContain("focus-visible:ring-2");
  });

  it("makes the selected section an explicit, persistent workspace context", () => {
    const html = renderToStaticMarkup(
      createElement(AdminFormsDashboard, {
        access: {
          canEdit: true,
          canManageSections: false,
          canRead: true,
          canReadResponses: true,
          isOfficer: false,
        },
        data,
        input: { ...input, sectionIds: [form.section.id] },
      }),
    );

    expect(html).toContain(`data-section-context="${form.section.id}"`);
    expect(html).toContain(`name="section"`);
    expect(html).toContain(`value="${form.section.id}" selected=""`);
  });

  it("auto-swaps section query state while preserving the current form view and search", () => {
    expect(
      sectionSelectionHref(
        "/admin/forms",
        "view=archive&query=workshop&section=old&page=3",
        form.section.id,
      ),
    ).toBe(
      `/admin/forms?view=archive&query=workshop&section=${form.section.id}`,
    );
    expect(
      sectionSelectionHref(
        "/admin/forms",
        `view=archive&section=${form.section.id}`,
        "",
      ),
    ).toBe("/admin/forms?view=archive");
  });
});
